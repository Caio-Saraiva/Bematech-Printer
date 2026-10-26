#include "bematech.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>

static void help(void){puts(
"Bematech Printer " BP_VERSION "\n"
"Usage: bematech-printer [serve|text|image] [options]\n"
"  serve                 Local web app (default; restores saved connection)\n"
"  text FILE             Print a UTF-8 text file using CP850\n"
"  image FILE            Print a binary PBM (P4) bitmap\n"
"  --device PORT         COM3, /dev/ttyACM0, /dev/cu.usbmodem...\n"
"  --config FILE         Local settings / connection / history file\n"
"  --output FILE         Export ESC/Bema bytes instead of printing (CLI)\n"
"  --port N              Loopback web port (default 8421)\n"
"  --columns N           Text columns (20..80, default 48)\n"
"  --dots N              Head width (320..832, default 576)\n"
"  --spacing N           Image band spacing (1..60, default 17)\n"
"  --feed N              Final lines (0..20, default 3)\n"
"  --no-cut              Disable guillotine\n"
"  --no-open             Do not launch the browser\n"
"  --help / --version    Show help / version\n"
"No device is opened in simulation. Ctrl+C stops the local server.");}
static int integer(const char *s,int lo,int hi){char *e;long n;errno=0;n=strtol(s,&e,10);if(errno||!*s||*e||n<lo||n>hi)return -1;return (int)n;}
int main(int argc,char **argv){
    const char *command="serve",*file=NULL,*device=NULL,*output=NULL,*config=NULL;int i,port=8421,open_browser=1,n;unsigned overrides=0;
    bp_options o=bp_defaults();bp_buffer input={0},job={0};char error[256];FILE *f;uint8_t chunk[4096];size_t count;
    for(i=1;i<argc;i++){
        if(!strcmp(argv[i],"--help")){help();return 0;}
        if(!strcmp(argv[i],"--version")){puts(BP_VERSION);return 0;}
        if(!strcmp(argv[i],"serve")){command="serve";continue;}
        if(!strcmp(argv[i],"text")||!strcmp(argv[i],"image")){command=argv[i];if(++i>=argc)goto bad;file=argv[i];continue;}
        if(!strcmp(argv[i],"--no-open")){open_browser=0;continue;}
        if(!strcmp(argv[i],"--no-cut")){o.cut=0;overrides|=16;continue;}
        if(i+1>=argc)goto bad;
        if(!strcmp(argv[i],"--device")){device=argv[++i];continue;}
        if(!strcmp(argv[i],"--config")){config=argv[++i];continue;}
        if(!strcmp(argv[i],"--output")){output=argv[++i];continue;}
        n=integer(argv[i+1],0,65535);if(n<0)goto bad;
        if(!strcmp(argv[i],"--port")&&n>=1024)port=n;
        else if(!strcmp(argv[i],"--columns")&&n>=20&&n<=80){o.columns=n;overrides|=1;}
        else if(!strcmp(argv[i],"--dots")&&n>=320&&n<=832){o.dots=n;overrides|=2;}
        else if(!strcmp(argv[i],"--spacing")&&n>=1&&n<=60){o.spacing=n;overrides|=4;}
        else if(!strcmp(argv[i],"--feed")&&n<=20){o.feed=n;overrides|=8;}
        else goto bad;i++;
    }
    if(!strcmp(command,"serve")){if(output)goto bad;return bp_serve(device,(unsigned)port,open_browser,&o,config,overrides);}
    if(!file||(!device&&!output)){fputs("Select --device or --output.\n",stderr);return 2;}
    f=fopen(file,"rb");if(!f){perror(file);return 1;}
    while((count=fread(chunk,1,sizeof(chunk),f))>0)if(bp_append(&input,chunk,count)){fclose(f);bp_free(&input);fputs("File too large\n",stderr);return 1;}
    if(ferror(f)){fclose(f);bp_free(&input);return 1;}fclose(f);
    if(!strcmp(command,"text")){
        if(memchr(input.data,0,input.len)||bp_append(&input,"",1)){bp_free(&input);return 1;}
        n=bp_text(&job,(char *)input.data,&o);
    }else n=bp_pbm(&job,input.data,input.len,&o);
    bp_free(&input);
    if(n){bp_free(&job);fputs("Invalid input: use UTF-8/CP850 text or a valid P4 bitmap. Other Unicode can use the web editor.\n",stderr);return 1;}
    if(output){f=fopen(output,"wb");if(!f){perror(output);bp_free(&job);return 1;}n=fwrite(job.data,1,job.len,f)==job.len?0:-1;if(fclose(f))n=-1;}
    else n=bp_send(device,job.data,job.len,error,sizeof(error));
    if(n){fprintf(stderr,"%s\n",output?"Cannot write output":error);bp_free(&job);return 1;}
    printf("%s: %zu bytes\n",output?"Exported":"Sent to serial",job.len);bp_free(&job);return 0;
bad:fputs("Invalid arguments. Use --help.\n",stderr);return 2;
}
