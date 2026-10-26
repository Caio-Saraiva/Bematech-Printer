#if defined(__APPLE__)
#define _DARWIN_C_SOURCE 1
#elif !defined(_WIN32)
#define _DEFAULT_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif
#include "native.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>
#include <ctype.h>
#include <errno.h>
#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winspool.h>
#else
#include <unistd.h>
#include <fcntl.h>
#include <termios.h>
#include <time.h>
#include <glob.h>
#endif

static void device(cJSON *list,const char *transport,const char *id,const char *label){
    cJSON *v,*entry;
    cJSON_ArrayForEach(v,list)if(!strcmp(bp_string(v,"transport",""),transport)&&!strcmp(bp_string(v,"device",""),id))return;
    entry=cJSON_CreateObject();cJSON_AddStringToObject(entry,"transport",transport);
    cJSON_AddStringToObject(entry,"device",id);cJSON_AddStringToObject(entry,"label",label);cJSON_AddItemToArray(list,entry);
}
#ifdef _WIN32
static wchar_t *wide(const char *s){
    int n=MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,s,-1,NULL,0);wchar_t *out;
    if(n<1)return NULL;out=malloc((size_t)n*sizeof(wchar_t));if(out)MultiByteToWideChar(CP_UTF8,0,s,-1,out,n);return out;
}
static char *utf8(const wchar_t *s){
    int n=WideCharToMultiByte(CP_UTF8,0,s,-1,NULL,0,NULL,NULL);char *out;if(n<1)return NULL;out=malloc((size_t)n);if(out)WideCharToMultiByte(CP_UTF8,0,s,-1,out,n,NULL,NULL);return out;
}
#endif
cJSON *bp_device_list(void){
    cJSON *list=cJSON_CreateArray();
#ifdef _WIN32
    int i;wchar_t name[32],target[4096];DWORD bytes=0,count=0;
    for(i=1;i<=256;i++){swprintf(name,32,L"COM%d",i);if(QueryDosDeviceW(name,target,4096)){char id[32];snprintf(id,sizeof(id),"COM%d",i);device(list,"serial",id,id);}}
    EnumPrintersW(PRINTER_ENUM_LOCAL|PRINTER_ENUM_CONNECTIONS,NULL,2,NULL,0,&bytes,&count);
    if(bytes){BYTE *buffer=malloc(bytes);if(buffer&&EnumPrintersW(PRINTER_ENUM_LOCAL|PRINTER_ENUM_CONNECTIONS,NULL,2,buffer,bytes,&bytes,&count)){
        PRINTER_INFO_2W *p=(PRINTER_INFO_2W *)buffer;DWORD j;for(j=0;j<count;j++){char *id=utf8(p[j].pPrinterName);if(id){device(list,"system",id,id);if(p[j].pPortName&&wcsncmp(p[j].pPortName,L"USB",3)==0)device(list,"usb",id,id);free(id);}}}free(buffer);}
#else
    const char *patterns[]={"/dev/ttyACM*","/dev/ttyUSB*","/dev/cu.usb*","/dev/serial/by-id/*","/dev/usb/lp*"};size_t i;
    for(i=0;i<sizeof(patterns)/sizeof(patterns[0]);i++){glob_t g;size_t j;memset(&g,0,sizeof(g));if(!glob(patterns[i],0,NULL,&g))for(j=0;j<g.gl_pathc;j++)device(list,strstr(g.gl_pathv[j],"/dev/usb/")?"usb":"serial",g.gl_pathv[j],g.gl_pathv[j]);globfree(&g);}
    {FILE *queues=popen("lpstat -a 2>/dev/null","r");if(queues){char line[1024];while(fgets(line,sizeof(line),queues)){char *end=strpbrk(line," \t\r\n");if(end)*end=0;if(*line)device(list,"system",line,line);}pclose(queues);}}
#endif
    return list;
}
int bp_connection_valid(const cJSON *c){
    const char *type=bp_string(c,"transport","!"),*name=bp_string(c,"device","!"),*parity=bp_string(c,"parity","none");size_t i;double baud=bp_number(c,"baud",9600),bits=bp_number(c,"data_bits",8),stop=bp_number(c,"stop_bits",1);
    if(!cJSON_IsObject(c)||strlen(name)>255||strstr(name,".."))return 0;
    for(i=0;name[i];i++)if((unsigned char)name[i]<32)return 0;
    if(strcmp(type,"simulation")&&strcmp(type,"serial")&&strcmp(type,"usb")&&strcmp(type,"system"))return 0;
    if(strcmp(type,"simulation")&&(!*name||*name=='-'))return 0;
    if(strcmp(parity,"none")&&strcmp(parity,"even")&&strcmp(parity,"odd"))return 0;
    if(bits!=7&&bits!=8)return 0;if(stop!=1&&stop!=2)return 0;
    if(baud!=1200&&baud!=2400&&baud!=4800&&baud!=9600&&baud!=19200&&baud!=38400&&baud!=57600&&baud!=115200)return 0;
    if(!strcmp(type,"serial")){
#ifdef _WIN32
        int port;if(strncmp(name,"COM",3)||!isdigit((unsigned char)name[3]))return 0;
        for(i=3;name[i];i++)if(!isdigit((unsigned char)name[i]))return 0;port=atoi(name+3);if(port<1||port>256)return 0;
#else
        if(strncmp(name,"/dev/tty",8)&&strncmp(name,"/dev/cu.",8)&&strncmp(name,"/dev/serial/by-id/",18)&&strncmp(name,"/dev/pts/",9))return 0;
#endif
    }
#ifndef _WIN32
    if(!strcmp(type,"usb")&&strncmp(name,"/dev/usb/lp",11))return 0;
#endif
    return 1;
}
#ifdef _WIN32
static int spool(const char *name,const uint8_t *data,size_t size,int probe,char *error,size_t cap){
    wchar_t *printer=wide(name);HANDLE h=NULL;DOC_INFO_1W doc;size_t pos=0;int document=0,page=0,ok=0;DWORD code;
    if(!printer||!OpenPrinterW(printer,&h,NULL))goto done;
    if(probe){ok=1;goto done;}
    memset(&doc,0,sizeof(doc));doc.pDocName=L"Bematech Printer";doc.pDatatype=L"RAW";
    if(!StartDocPrinterW(h,1,(LPBYTE)&doc))goto done;document=1;if(!StartPagePrinter(h))goto done;page=1;
    while(pos<size){DWORD n=0;if(!WritePrinter(h,(LPVOID)(data+pos),(DWORD)(size-pos),&n)||!n)goto done;pos+=n;}
    if(!EndPagePrinter(h))goto done;page=0;if(!EndDocPrinter(h))goto done;document=0;ok=1;
done:code=GetLastError();if(h){if(page)EndPagePrinter(h);if(document)AbortPrinter(h);ClosePrinter(h);}free(printer);
    if(!ok)snprintf(error,cap,"Windows print queue error %lu",(unsigned long)code);return ok?0:-1;
}
static int serial(const cJSON *c,const uint8_t *data,size_t size,int probe,char *error,size_t cap){
    char path[300];HANDLE h;DCB d;COMMTIMEOUTS t={0};size_t pos=0;DWORD code;const char *name=bp_string(c,"device","");
    snprintf(path,sizeof(path),"\\\\.\\%s",name);h=CreateFileA(path,GENERIC_READ|GENERIC_WRITE,0,NULL,OPEN_EXISTING,0,NULL);
    if(h==INVALID_HANDLE_VALUE)goto fail;
    if(probe){CloseHandle(h);return 0;}
    memset(&d,0,sizeof(d));d.DCBlength=sizeof(d);if(!GetCommState(h,&d))goto close_fail;
    d.BaudRate=(DWORD)bp_number(c,"baud",9600);d.ByteSize=(BYTE)bp_number(c,"data_bits",8);d.StopBits=bp_number(c,"stop_bits",1)==2?TWOSTOPBITS:ONESTOPBIT;
    d.Parity=!strcmp(bp_string(c,"parity","none"),"even")?EVENPARITY:!strcmp(bp_string(c,"parity","none"),"odd")?ODDPARITY:NOPARITY;
    d.fBinary=TRUE;d.fParity=d.Parity!=NOPARITY;d.fOutxCtsFlow=FALSE;d.fOutxDsrFlow=FALSE;d.fDsrSensitivity=FALSE;
    d.fOutX=FALSE;d.fInX=FALSE;d.fAbortOnError=FALSE;d.fDtrControl=DTR_CONTROL_ENABLE;d.fRtsControl=RTS_CONTROL_ENABLE;
    t.WriteTotalTimeoutConstant=15000;if(!SetCommState(h,&d)||!SetCommTimeouts(h,&t))goto close_fail;
    while(pos<size){DWORD n=0;if(!WriteFile(h,data+pos,(DWORD)(size-pos),&n,NULL)||!n)goto close_fail;pos+=n;}
    if(!FlushFileBuffers(h))goto close_fail;Sleep(150);CloseHandle(h);return 0;
close_fail:code=GetLastError();CloseHandle(h);SetLastError(code);
fail:snprintf(error,cap,"Serial error %lu",(unsigned long)GetLastError());return -1;
}
#else
static speed_t speed(int n){
    switch(n){case 1200:return B1200;case 2400:return B2400;case 4800:return B4800;case 19200:return B19200;case 38400:return B38400;case 57600:return B57600;case 115200:return B115200;default:return B9600;}
}
static int direct(const cJSON *c,const uint8_t *data,size_t size,int probe,char *error,size_t cap){
    int usb=!strcmp(bp_string(c,"transport",""),"usb"),fd;struct termios t;size_t pos=0;const char *stage="open";
    fd=open(bp_string(c,"device",""),(usb?O_WRONLY:O_RDWR)|O_NOCTTY|O_NONBLOCK);if(fd<0)goto fail;
    if(!usb){stage="read attributes";if(tcgetattr(fd,&t)<0)goto close_fail;
        if(!probe){const char *parity=bp_string(c,"parity","none");t.c_iflag=0;t.c_oflag=0;t.c_lflag=0;t.c_cflag=CREAD|CLOCAL;
            t.c_cflag|=bp_number(c,"data_bits",8)==7?CS7:CS8;if(bp_number(c,"stop_bits",1)==2)t.c_cflag|=CSTOPB;
            if(strcmp(parity,"none")){t.c_cflag|=PARENB;if(!strcmp(parity,"odd"))t.c_cflag|=PARODD;}
            t.c_cc[VMIN]=0;t.c_cc[VTIME]=0;stage="set speed";
            if(cfsetispeed(&t,speed((int)bp_number(c,"baud",9600)))||cfsetospeed(&t,speed((int)bp_number(c,"baud",9600))))goto close_fail;
            stage="set attributes";if(tcsetattr(fd,TCSANOW,&t))goto close_fail;}}
    if(probe){close(fd);return 0;}
    if(fcntl(fd,F_SETFL,0)<0)goto close_fail;
    stage="write";while(pos<size){ssize_t n=write(fd,data+pos,size-pos);if(n<0&&errno==EINTR)continue;if(n<=0)goto close_fail;pos+=(size_t)n;}
    if(!usb){stage="drain";if(tcdrain(fd))goto close_fail;{struct timespec pause={0,150000000};nanosleep(&pause,NULL);}}
    close(fd);return 0;
close_fail:{int saved=errno;close(fd);errno=saved;}
fail:snprintf(error,cap,"%s: %s",stage,strerror(errno));return -1;
}
static int queue(const char *name,const uint8_t *data,size_t size,int probe,char *error,size_t cap){
    char path[]="/tmp/bematech-job-XXXXXX";int fd,result;const char *args[8];size_t pos=0;
    if(probe){args[0]="lpstat";args[1]="-p";args[2]=name;args[3]=NULL;return bp_run(args,NULL,10,error,cap);}
    fd=mkstemp(path);if(fd<0){snprintf(error,cap,"Cannot create temporary print job");return -1;}
    while(pos<size){ssize_t n=write(fd,data+pos,size-pos);if(n<0&&errno==EINTR)continue;if(n<=0){close(fd);unlink(path);return -1;}pos+=(size_t)n;}close(fd);
    args[0]="lp";args[1]="-d";args[2]=name;args[3]="-o";args[4]="raw";args[5]="--";args[6]=path;args[7]=NULL;
    result=bp_run(args,NULL,30,error,cap);unlink(path);return result;
}
#endif
static int send_or_probe(const cJSON *connection,const uint8_t *data,size_t size,int probe,char *error,size_t cap){
    const char *type=bp_string(connection,"transport","simulation");
    if(!bp_connection_valid(connection)){snprintf(error,cap,"Invalid local connection");return -1;}
    if(!strcmp(type,"simulation"))return 0;
#ifdef _WIN32
    if(!strcmp(type,"serial"))return serial(connection,data,size,probe,error,cap);
    return spool(bp_string(connection,"device",""),data,size,probe,error,cap);
#else
    if(!strcmp(type,"system"))return queue(bp_string(connection,"device",""),data,size,probe,error,cap);
    return direct(connection,data,size,probe,error,cap);
#endif
}
int bp_connection_send(const cJSON *c,const uint8_t *data,size_t size,char *error,size_t cap){return send_or_probe(c,data,size,0,error,cap);}
int bp_connection_probe(const cJSON *c,char *error,size_t cap){return send_or_probe(c,NULL,0,1,error,cap);}
int bp_send(const char *name,const uint8_t *data,size_t size,char *error,size_t cap){
    cJSON *c=cJSON_CreateObject();int result;
    cJSON_AddStringToObject(c,"transport","serial");cJSON_AddStringToObject(c,"device",name?name:"");
    result=bp_connection_send(c,data,size,error,cap);cJSON_Delete(c);return result;
}
