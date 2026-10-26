#include "bematech.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <stdint.h>
#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <shellapi.h>
typedef SOCKET bp_socket;
#define CLOSE closesocket
#define BAD_SOCKET INVALID_SOCKET
#else
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <signal.h>
#include <sys/wait.h>
typedef int bp_socket;
#define CLOSE close
#define BAD_SOCKET (-1)
#endif
#include "web_assets.h"
#define HTTP_LIMIT (2u*1024u*1024u)
static int send_all(bp_socket s,const void *p,size_t n){const char *b=p;while(n){int k=send(s,b,(int)n,0);if(k<=0)return -1;b+=k;n-=(size_t)k;}return 0;}
static void reply(bp_socket s,int code,const char *type,const void *body,size_t size){
    char header[1024];int n=snprintf(header,sizeof(header),
    "HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %zu\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nX-Frame-Options: DENY\r\nContent-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'\r\n\r\n",
    code,code==200?"OK":code==202?"Accepted":"Error",type,size);
    if(n>0 && (size_t)n<sizeof(header)&&!send_all(s,header,(size_t)n))send_all(s,body,size);
}
static void json(bp_socket s,int code,const char *body){reply(s,code,"application/json",body,strlen(body));}
static int equal_n(const char *a,const char *b,size_t n){size_t i;for(i=0;i<n;i++)if(tolower((unsigned char)a[i])!=tolower((unsigned char)b[i]))return 0;return 1;}
/* Return a unique header; duplicates and overlong values are rejected. */
static int header(const char *headers,const char *key,char *out,size_t cap){
    const char *p=strstr(headers,"\r\n");size_t keylen=strlen(key);int found=0;
    if(!p)return 0;p+=2;
    while(*p && strncmp(p,"\r\n",2)){
        const char *end=strstr(p,"\r\n"),*value;size_t len;
        if(!end)return -1;
        if((size_t)(end-p)>keylen && equal_n(p,key,keylen)&&p[keylen]==':'){
            if(found)return -1;value=p+keylen+1;while(value<end&&(*value==' '||*value=='\t'))value++;
            len=(size_t)(end-value);if(len>=cap)return -1;memcpy(out,value,len);out[len]=0;found=1;
        }p=end+2;
    }return found;
}
static void launch(unsigned port){
    char url[64];snprintf(url,sizeof(url),"http://127.0.0.1:%u",port);
#ifdef _WIN32
    ShellExecuteA(NULL,"open",url,NULL,NULL,SW_SHOWNORMAL);
#else
    pid_t child=fork();
    if(child==0){pid_t grandchild=fork();if(grandchild==0){
#ifdef __APPLE__
        execlp("open","open",url,(char *)NULL);
#else
        execlp("xdg-open","xdg-open",url,(char *)NULL);
#endif
        _exit(0);} _exit(0);}
    if(child>0)waitpid(child,NULL,0);
#endif
}
static void request(bp_socket client,const char *device,unsigned port,const bp_options *opt){
    char *buf=malloc(HTTP_LIMIT+1),method[12],path[256],version[20],*end;
    char host[128],expected[128],length[32],origin[128],marker[32],transfer[64];
    size_t received=0,body_start=0,body_size=0;int k,hlen;unsigned long long wanted=0;
    bp_buffer job={0};char response[192],error[256];
    if(!buf){json(client,500,"{\"error\":\"Out of memory\"}");return;}
    while(received<16384){
        k=recv(client,buf+received,(int)(16384-received),0);if(k<=0)goto done;
        received+=(size_t)k;buf[received]=0;end=strstr(buf,"\r\n\r\n");
        if(end){body_start=(size_t)(end-buf)+4;break;}
    }
    if(!body_start){json(client,400,"{\"error\":\"Headers too large\"}");goto done;}
    if(sscanf(buf,"%11s %255s %19s",method,path,version)!=3){json(client,400,"{\"error\":\"Invalid request\"}");goto done;}
    /* Limit header parsing to the header block, while retaining body bytes. */
    buf[body_start-2]=0;
    snprintf(expected,sizeof(expected),"127.0.0.1:%u",port);
    hlen=header(buf,"Host",host,sizeof(host));
    if(hlen!=1 || strcmp(host,expected)){json(client,403,"{\"error\":\"Use the printed loopback URL\"}");goto done;}
    if(!strcmp(method,"GET")){
        size_t i;if(!strcmp(path,"/api/info")){
            snprintf(response,sizeof(response),"{\"version\":\"%s\",\"mode\":\"%s\",\"dots\":%d,\"columns\":%d,\"spacing\":%d,\"feed\":%d,\"cut\":%s}",BP_VERSION,device?"serial":"simulation",opt->dots,opt->columns,opt->spacing,opt->feed,opt->cut?"true":"false");json(client,200,response);goto done;
        }
        if(!strcmp(path,"/"))strcpy(path,"/index.html");
        for(i=0;i<sizeof(assets)/sizeof(assets[0]);i++)if(!strcmp(path,assets[i].path)){
            reply(client,200,assets[i].type,assets[i].data,assets[i].size);goto done;
        }
        json(client,404,"{\"error\":\"Not found\"}");goto done;
    }
    if(strcmp(method,"POST") || (strcmp(path,"/api/print")&&strcmp(path,"/api/text"))){json(client,404,"{\"error\":\"Not found\"}");goto done;}
    /* Local-only boundary, without accounts: browser requests must originate here.
       Custom header blocks form POSTs; no CORS/preflight permission is provided. */
    snprintf(expected,sizeof(expected),"http://127.0.0.1:%u",port);
    hlen=header(buf,"Origin",origin,sizeof(origin));
    if(hlen<0 || (hlen==1&&strcmp(origin,expected)) || header(buf,"X-Bematech-Client",marker,sizeof(marker))!=1 || strcmp(marker,"1")){
        json(client,403,"{\"error\":\"Local client required\"}");goto done;
    }
    if(header(buf,"Transfer-Encoding",transfer,sizeof(transfer))!=0 || header(buf,"Content-Length",length,sizeof(length))!=1){json(client,400,"{\"error\":\"Content-Length required\"}");goto done;}
    {char *q=length;if(!*q)goto invalid;while(*q){if(*q<'0'||*q>'9'||wanted>HTTP_LIMIT)goto invalid;wanted=wanted*10+(unsigned)(*q++-'0');}}
    if(!wanted||wanted>HTTP_LIMIT-body_start)goto invalid;
    body_size=(size_t)wanted;
    while(received<body_start+body_size){k=recv(client,buf+received,(int)(body_start+body_size-received),0);if(k<=0)goto done;received+=(size_t)k;}
    buf[body_start+body_size]=0;
    if(!strcmp(path,"/api/text")){
        if(memchr(buf+body_start,0,body_size))goto invalid;
        k=bp_text(&job,buf+body_start,opt);
    }else k=bp_pbm(&job,(uint8_t *)buf+body_start,body_size,opt);
    if(k)goto invalid;
    if(device && bp_send(device,job.data,job.len,error,sizeof(error))){fprintf(stderr,"%s\n",error);json(client,500,"{\"error\":\"Serial write failed. Check the terminal and device.\"}");goto done;}
    snprintf(response,sizeof(response),"{\"status\":\"%s\",\"bytes\":%zu}",device?"sent":"simulated",job.len);json(client,202,response);goto done;
invalid:json(client,400,"{\"error\":\"Invalid or oversized print data\"}");
done:bp_free(&job);free(buf);
}
int bp_serve(const char *device,unsigned port,int open_browser,const bp_options *opt){
    bp_socket server,client;struct sockaddr_in addr;int reuse=1;
#ifdef _WIN32
    WSADATA wsa;if(WSAStartup(MAKEWORD(2,2),&wsa))return 1;
#else
    signal(SIGPIPE,SIG_IGN);
#endif
    server=socket(AF_INET,SOCK_STREAM,0);if(server==BAD_SOCKET)return 1;
    setsockopt(server,SOL_SOCKET,SO_REUSEADDR,(const char *)&reuse,sizeof(reuse));
    memset(&addr,0,sizeof(addr));addr.sin_family=AF_INET;addr.sin_port=htons((uint16_t)port);addr.sin_addr.s_addr=htonl(INADDR_LOOPBACK);
    if(bind(server,(struct sockaddr *)&addr,sizeof(addr))||listen(server,8)){fputs("Cannot bind local port. Choose --port.\n",stderr);CLOSE(server);return 1;}
    printf("Bematech Printer %s\nhttp://127.0.0.1:%u\nMode: %s\nCtrl+C to stop.\n",BP_VERSION,port,device?"real serial output":"simulation (no device)");fflush(stdout);
    if(open_browser)launch(port);
    for(;;){
        client=accept(server,NULL,NULL);if(client==BAD_SOCKET)break;
#ifdef _WIN32
        {DWORD timeout=10000;setsockopt(client,SOL_SOCKET,SO_RCVTIMEO,(char *)&timeout,sizeof(timeout));setsockopt(client,SOL_SOCKET,SO_SNDTIMEO,(char *)&timeout,sizeof(timeout));}
#else
        {struct timeval timeout={10,0};setsockopt(client,SOL_SOCKET,SO_RCVTIMEO,&timeout,sizeof(timeout));setsockopt(client,SOL_SOCKET,SO_SNDTIMEO,&timeout,sizeof(timeout));}
#endif
        request(client,device,port,opt);
        /* Let error responses reach clients even when a rejected request has
           unread body bytes. A bounded drain avoids TCP reset on close. */
        shutdown(client,1);
        {unsigned count;char discard[16384];for(count=0;count<128;count++){
            fd_set reads;struct timeval wait={0,50000};FD_ZERO(&reads);FD_SET(client,&reads);
            if(select((int)client+1,&reads,NULL,NULL,&wait)<=0)break;
            if(recv(client,discard,sizeof(discard),0)<=0)break;
        }}
        CLOSE(client);
    }
    CLOSE(server);
#ifdef _WIN32
    WSACleanup();
#endif
    return 0;
}
