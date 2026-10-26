#ifndef _WIN32
#define _POSIX_C_SOURCE 200809L
#endif
#include "native.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <wchar.h>
static int argument(bp_buffer *b,const char *s){
    size_t slashes=0,i;if(bp_append(b,"\"",1))return -1;
    for(i=0;;i++){
        if(s[i]=='\\'){slashes++;continue;}
        if(s[i]=='"'||!s[i]){size_t j;for(j=0;j<slashes*2;j++)if(bp_append(b,"\\",1))return -1;}
        else {size_t j;for(j=0;j<slashes;j++)if(bp_append(b,"\\",1))return -1;}
        slashes=0;if(!s[i])break;if(s[i]=='"'&&bp_append(b,"\\",1))return -1;if(bp_append(b,s+i,1))return -1;
    }return bp_append(b,"\" ",2);
}
int bp_run(const char *const *args,const char *output,unsigned seconds,char *error,size_t cap){
    SECURITY_ATTRIBUTES security={sizeof(SECURITY_ATTRIBUTES),NULL,TRUE};STARTUPINFOW start;PROCESS_INFORMATION process;HANDLE file=NULL,group=NULL;
    bp_buffer command={0};wchar_t *wide_command=NULL,*wide_output=NULL;DWORD waited,exitcode=1;int i,n,ok=0;
    for(i=0;args[i];i++){const char *arg=args[i];
        if(i==0&&!strcmp(arg,"libreoffice")&&GetFileAttributesW(L"C:\\Program Files\\LibreOffice\\program\\soffice.exe")!=INVALID_FILE_ATTRIBUTES)arg="C:\\Program Files\\LibreOffice\\program\\soffice.exe";
        if(argument(&command,arg))goto done;}
    if(command.len>30000||bp_append(&command,"",1))goto done;
    n=MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,(char *)command.data,-1,NULL,0);if(!n)goto done;wide_command=malloc((size_t)n*sizeof(wchar_t));if(!wide_command)goto done;MultiByteToWideChar(CP_UTF8,0,(char *)command.data,-1,wide_command,n);
    if(output){n=MultiByteToWideChar(CP_UTF8,0,output,-1,NULL,0);wide_output=malloc((size_t)n*sizeof(wchar_t));if(!wide_output)goto done;MultiByteToWideChar(CP_UTF8,0,output,-1,wide_output,n);}
    file=CreateFileW(output?wide_output:L"NUL",GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,&security,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,NULL);
    if(file==INVALID_HANDLE_VALUE){file=NULL;goto done;}
    memset(&start,0,sizeof(start));start.cb=sizeof(start);start.dwFlags=STARTF_USESTDHANDLES;start.hStdOutput=file;start.hStdError=file;start.hStdInput=GetStdHandle(STD_INPUT_HANDLE);
    memset(&process,0,sizeof(process));
    if(!CreateProcessW(NULL,wide_command,NULL,NULL,TRUE,CREATE_NO_WINDOW|CREATE_SUSPENDED,NULL,NULL,&start,&process))goto done;
    group=CreateJobObjectW(NULL,NULL);if(group){JOBOBJECT_EXTENDED_LIMIT_INFORMATION limit;memset(&limit,0,sizeof(limit));limit.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;SetInformationJobObject(group,JobObjectExtendedLimitInformation,&limit,sizeof(limit));AssignProcessToJobObject(group,process.hProcess);}
    ResumeThread(process.hThread);waited=WaitForSingleObject(process.hProcess,seconds*1000);
    if(waited!=WAIT_OBJECT_0)TerminateProcess(process.hProcess,1);
    WaitForSingleObject(process.hProcess,5000);GetExitCodeProcess(process.hProcess,&exitcode);
    CloseHandle(process.hThread);CloseHandle(process.hProcess);ok=waited==WAIT_OBJECT_0&&exitcode==0;
done:if(group)CloseHandle(group);if(file)CloseHandle(file);free(wide_command);free(wide_output);bp_free(&command);
    if(!ok)snprintf(error,cap,"Cannot run %s. Install the documented native helper and check the file (timeout %u s).",args[0],seconds);return ok?0:-1;
}
#else
#include <unistd.h>
#include <fcntl.h>
#include <signal.h>
#include <sys/wait.h>
#include <errno.h>
int bp_run(const char *const *args,const char *output,unsigned seconds,char *error,size_t cap){
    pid_t child=fork();int status=0;unsigned attempts=seconds*10;pid_t result;
    if(child<0){snprintf(error,cap,"Cannot start converter: %s",strerror(errno));return -1;}
    if(child==0){
        int file=open(output?output:"/dev/null",O_WRONLY|O_CREAT|O_TRUNC,0600);setpgid(0,0);
        if(file<0)_exit(126);dup2(file,STDOUT_FILENO);dup2(file,STDERR_FILENO);close(file);
        execvp(args[0],(char *const *)args);_exit(127);
    }
    for(;;){result=waitpid(child,&status,WNOHANG);if(result==child)break;if(result<0&&errno!=EINTR)break;
        if(!attempts--){kill(-child,SIGKILL);kill(child,SIGKILL);waitpid(child,&status,0);snprintf(error,cap,"%s exceeded %u seconds",args[0],seconds);return -1;}
        {struct timespec pause={0,100000000};nanosleep(&pause,NULL);}}
    if(result==child&&WIFEXITED(status)&&WEXITSTATUS(status)==0)return 0;
    snprintf(error,cap,"Cannot run %s. Install the documented native helper and check the file.",args[0]);return -1;
}
#endif
