#ifndef _WIN32
#define _POSIX_C_SOURCE 200809L
#endif
#include "bematech.h"
#include <stdio.h>
#include <string.h>
#include <errno.h>
#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#else
#include <unistd.h>
#include <fcntl.h>
#include <termios.h>
#include <time.h>
#endif
int bp_send(const char *device,const uint8_t *data,size_t size,char *error,size_t error_size){
    if(!device||!*device){snprintf(error,error_size,"No device selected");return -1;}
#ifdef _WIN32
    char path[256]; HANDLE fd; DCB dcb; COMMTIMEOUTS timeout={0};size_t pos=0;
    if(strlen(device)>200){snprintf(error,error_size,"Invalid device");return -1;}
    snprintf(path,sizeof(path),"\\\\.\\%s",device);
    fd=CreateFileA(path,GENERIC_READ|GENERIC_WRITE,0,NULL,OPEN_EXISTING,0,NULL);
    if(fd==INVALID_HANDLE_VALUE)goto fail;
    memset(&dcb,0,sizeof(dcb));dcb.DCBlength=sizeof(dcb);
    if(!GetCommState(fd,&dcb))goto close_fail;
    dcb.BaudRate=CBR_9600;dcb.ByteSize=8;dcb.Parity=NOPARITY;dcb.StopBits=ONESTOPBIT;
    dcb.fBinary=TRUE;dcb.fParity=FALSE;dcb.fOutxCtsFlow=FALSE;dcb.fOutxDsrFlow=FALSE;
    dcb.fOutX=FALSE;dcb.fInX=FALSE;dcb.fDtrControl=DTR_CONTROL_ENABLE;dcb.fRtsControl=RTS_CONTROL_ENABLE;
    timeout.WriteTotalTimeoutConstant=15000;
    if(!SetCommState(fd,&dcb)||!SetCommTimeouts(fd,&timeout))goto close_fail;
    while(pos<size){DWORD n=0;if(!WriteFile(fd,data+pos,(DWORD)(size-pos),&n,NULL)||!n)goto close_fail;pos+=n;}
    if(!FlushFileBuffers(fd))goto close_fail;Sleep(150);CloseHandle(fd);return 0;
close_fail: {DWORD code=GetLastError();CloseHandle(fd);SetLastError(code);}
fail:snprintf(error,error_size,"Serial error %lu",(unsigned long)GetLastError());return -1;
#else
    int fd;struct termios t;size_t pos=0;const char *stage="open";
    fd=open(device,O_RDWR|O_NOCTTY|O_NONBLOCK);if(fd<0)goto fail;
    stage="read attributes";
    if(fcntl(fd,F_SETFL,0)<0||tcgetattr(fd,&t)<0)goto close_fail;
    t.c_iflag=0;t.c_oflag=0;t.c_lflag=0;
    /* Replace inherited control flags, including platform-specific modem
       flow control, rather than retaining the previous application's state. */
    t.c_cflag=CS8|CREAD|CLOCAL;t.c_cc[VMIN]=0;t.c_cc[VTIME]=0;
    stage="set speed";if(cfsetispeed(&t,B9600)<0||cfsetospeed(&t,B9600)<0)goto close_fail;
    stage="set attributes";if(tcsetattr(fd,TCSANOW,&t)<0)goto close_fail;
    stage="write";
    while(pos<size){ssize_t n=write(fd,data+pos,size-pos);if(n<0&&errno==EINTR)continue;if(n<=0)goto close_fail;pos+=(size_t)n;}
    stage="drain";if(tcdrain(fd)<0)goto close_fail;
    {struct timespec pause={0,150000000};nanosleep(&pause,NULL);}
    close(fd);return 0;
close_fail:{int saved=errno;close(fd);errno=saved;}
fail:snprintf(error,error_size,"Serial %s: %s",stage,strerror(errno));return -1;
#endif
}
