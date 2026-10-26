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
#include <ctype.h>
#include <math.h>
#include <sys/stat.h>
#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <direct.h>
#else
#include <unistd.h>
#include <dirent.h>
#endif
static uint8_t *readfile(const char *path,size_t limit,size_t *size){
    FILE *f=fopen(path,"rb");long n;uint8_t *data;if(!f)return NULL;
    if(fseek(f,0,SEEK_END)||(n=ftell(f))<0||(size_t)n>limit){fclose(f);return NULL;}rewind(f);
    data=malloc((size_t)n+1);if(!data){fclose(f);return NULL;}if(fread(data,1,(size_t)n,f)!=(size_t)n){free(data);fclose(f);return NULL;}fclose(f);data[n]=0;*size=(size_t)n;return data;
}
static int tempdir(char *out,size_t size){
#ifdef _WIN32
    char base[MAX_PATH],file[MAX_PATH];if(!GetTempPathA(MAX_PATH,base)||!GetTempFileNameA(base,"bmp",0,file))return -1;DeleteFileA(file);if(!CreateDirectoryA(file,NULL))return -1;if(strlen(file)>=size)return -1;strcpy(out,file);return 0;
#else
    if(size<40)return -1;strcpy(out,"/tmp/bematech-document-XXXXXX");return mkdtemp(out)?0:-1;
#endif
}
static void cleanup(const char *path,int depth){
    if(depth>16)return;
#ifdef _WIN32
    char pattern[4096],child[4096];WIN32_FIND_DATAA found;HANDLE search;snprintf(pattern,sizeof(pattern),"%s/*",path);search=FindFirstFileA(pattern,&found);
    if(search!=INVALID_HANDLE_VALUE){do{if(!strcmp(found.cFileName,".")||!strcmp(found.cFileName,".."))continue;snprintf(child,sizeof(child),"%s/%s",path,found.cFileName);
        if((found.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)&&!(found.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT))cleanup(child,depth+1);else DeleteFileA(child);}while(FindNextFileA(search,&found));FindClose(search);}RemoveDirectoryA(path);
#else
    DIR *directory=opendir(path);struct dirent *entry;if(directory){while((entry=readdir(directory))){char child[4096];struct stat st;if(!strcmp(entry->d_name,".")||!strcmp(entry->d_name,".."))continue;
        if(snprintf(child,sizeof(child),"%s/%s",path,entry->d_name)>=(int)sizeof(child))continue;
        if(!lstat(child,&st)){if(S_ISDIR(st.st_mode))cleanup(child,depth+1);else unlink(child);}}closedir(directory);}rmdir(path);
#endif
}
static int token(const uint8_t **p,const uint8_t *end,char *text,size_t cap){
    size_t n=0;
    for(;;){while(*p<end&&isspace(**p))(*p)++;if(*p<end&&**p=='#'){while(*p<end&&**p!='\n')(*p)++;}else break;}
    while(*p<end&&!isspace(**p)){if(n+1>=cap)return -1;text[n++]=(char)*(*p)++;}text[n]=0;return n?0:-1;
}
static cJSON *raster_page(const char *path,int dots){
    size_t size;uint8_t *data=readfile(path,8000000,&size),*packed=NULL;const uint8_t *p,*end,*pixels;char value[64],*tail;
    int w,h,max,left,right,top,bottom,pad,x,y,target_w,target_h;double factor;size_t stride;char *base64=NULL;cJSON *image=NULL;
    if(!data)return NULL;p=data;end=data+size;
    if(token(&p,end,value,sizeof(value))||strcmp(value,"P5"))goto done;
    if(token(&p,end,value,sizeof(value)))goto done;w=(int)strtol(value,&tail,10);if(*tail)goto done;
    if(token(&p,end,value,sizeof(value)))goto done;h=(int)strtol(value,&tail,10);if(*tail)goto done;
    if(token(&p,end,value,sizeof(value)))goto done;max=(int)strtol(value,&tail,10);
    if(*tail||max!=255||w<1||w>1664||h<1||h>4000||p==end||!isspace(*p))goto done;
    if(*p++=='\r'&&p<end&&*p=='\n')p++;
    if((size_t)(end-p)!=(size_t)w*(size_t)h)goto done;pixels=p;left=w;right=0;top=h;bottom=0;
    for(y=0;y<h;y++)for(x=0;x<w;x++)if(pixels[(size_t)y*w+x]<245){if(x<left)left=x;if(x+1>right)right=x+1;if(y<top)top=y;if(y+1>bottom)bottom=y+1;}
    if(right<=left||bottom<=top){left=top=0;right=w;bottom=h;}
    pad=w/50;if(pad<12)pad=12;left=left>pad?left-pad:0;right=right+pad<w?right+pad:w;
    pad=h/80;if(pad<12)pad=12;top=top>pad?top-pad:0;bottom=bottom+pad<h?bottom+pad:h;
    target_w=dots;target_h=(int)floor((double)(bottom-top)*target_w/(right-left)+.5);if(target_h<1)target_h=1;
    if(target_h>2000){target_h=2000;target_w=(int)floor((double)(right-left)*target_h/(bottom-top)+.5);if(target_w<1)target_w=1;}
    stride=((unsigned)target_w+7)/8;packed=calloc(stride*(size_t)target_h,1);if(!packed)goto done;
    factor=(double)(right-left)/target_w;
    for(y=0;y<target_h;y++)for(x=0;x<target_w;x++){
        double sx=(x+.5)*factor-.5,sy=(y+.5)*(bottom-top)/target_h-.5,fx,fy,a,b,v;int x0=(int)sx,y0=(int)sy,x1,y1;
        if(x0<0)x0=0;if(y0<0)y0=0;if(x0>=right-left)x0=right-left-1;if(y0>=bottom-top)y0=bottom-top-1;
        x1=x0+1<right-left?x0+1:x0;y1=y0+1<bottom-top?y0+1:y0;fx=sx-x0;fy=sy-y0;if(fx<0)fx=0;if(fy<0)fy=0;
        a=pixels[(size_t)(top+y0)*w+left+x0]*(1-fx)+pixels[(size_t)(top+y0)*w+left+x1]*fx;
        b=pixels[(size_t)(top+y1)*w+left+x0]*(1-fx)+pixels[(size_t)(top+y1)*w+left+x1]*fx;v=a*(1-fy)+b*fy;
        if(v>=245)v=255;else v=128+(v-128)*1.55;
        if(v<170)packed[(size_t)y*stride+x/8]|=(uint8_t)(128>>(x%8));
    }
    base64=bp_base64_encode(packed,stride*(size_t)target_h);if(!base64)goto done;
    image=cJSON_CreateObject();cJSON_AddNumberToObject(image,"width",target_w);cJSON_AddNumberToObject(image,"height",target_h);
    cJSON_AddStringToObject(image,"data_base64",base64);cJSON_AddStringToObject(image,"packing","row");
done:free(data);free(packed);free(base64);return image;
}
static void file_uri(const char *path,char *uri,size_t capacity){
    static const char hex[]="0123456789ABCDEF";size_t i,k=0;const char *prefix;
#ifdef _WIN32
    prefix="file:///";
#else
    prefix="file://";
#endif
    while(*prefix&&k+1<capacity)uri[k++]=*prefix++;
    for(i=0;path[i]&&k+4<capacity;i++){unsigned char ch=(unsigned char)path[i];if(ch=='\\')ch='/';
        if(isalnum(ch)||strchr("/:-_.",ch))uri[k++]=(char)ch;
        else {uri[k++]='%';uri[k++]=hex[ch>>4];uri[k++]=hex[ch&15];}}uri[k]=0;
}
cJSON *bp_read_document(const cJSON *request,int dots,char *error,size_t cap){
    const char *name=bp_string(request,"filename","file"),*mode=bp_string(request,"mode","text"),*suffix=strrchr(name,'.');char ext[16],dir[4096]="",source[4200],pdf[4200],output[4200],info[4200],profile[4300],uri[4200],page[32];
    bp_buffer decoded={0};cJSON *result=NULL,*pages=NULL;FILE *file;size_t n=0,info_size=0;uint8_t *text=NULL;int count=1,i,office=0;
    if(!suffix||strlen(suffix)>=sizeof(ext)){snprintf(error,cap,"Unsupported document extension");return NULL;}
    for(i=0;suffix[i];i++)ext[i]=(char)tolower((unsigned char)suffix[i]);ext[i]=0;
    if(strcmp(mode,"text")&&strcmp(mode,"raster"))goto invalid;
    office=!strcmp(ext,".doc")||!strcmp(ext,".docx")||!strcmp(ext,".odt")||!strcmp(ext,".rtf")||!strcmp(ext,".ppt")||!strcmp(ext,".pptx")||!strcmp(ext,".xls")||!strcmp(ext,".xlsx");
    if(!office&&strcmp(ext,".pdf"))goto invalid;
    if(bp_base64_decode(bp_string(request,"data_base64","!"),&decoded)||!decoded.len||decoded.len>10000000)goto invalid;
    if(tempdir(dir,sizeof(dir))){snprintf(error,cap,"Cannot create private temporary directory");goto done;}
    snprintf(source,sizeof(source),"%s/input%s",dir,ext);file=fopen(source,"wb");if(!file){snprintf(error,cap,"Cannot write temporary document");goto done;}
    {int bad=fwrite(decoded.data,1,decoded.len,file)!=decoded.len;if(fclose(file))bad=1;if(bad){snprintf(error,cap,"Cannot write temporary document");goto done;}}
    if(office){
        char profile_path[4200];const char *args[9];snprintf(profile_path,sizeof(profile_path),"%s/profile",dir);file_uri(profile_path,uri,sizeof(uri));snprintf(profile,sizeof(profile),"-env:UserInstallation=%s",uri);
        args[0]="libreoffice";args[1]="--headless";args[2]=profile;args[3]="--convert-to";args[4]="pdf";args[5]="--outdir";args[6]=dir;args[7]=source;args[8]=NULL;
        if(bp_run(args,NULL,45,error,cap))goto done;snprintf(pdf,sizeof(pdf),"%s/input.pdf",dir);
    }else snprintf(pdf,sizeof(pdf),"%s",source);
    snprintf(info,sizeof(info),"%s/info.txt",dir);
    {const char *args[]={"pdfinfo",pdf,NULL};if(bp_run(args,info,12,error,cap))goto done;}
    text=readfile(info,64000,&info_size);if(!text){snprintf(error,cap,"Cannot read PDF metadata");goto done;}
    {char *found=strstr((char *)text,"Pages:");if(found)count=atoi(found+6);}free(text);text=NULL;
    if(count<1||count>(!strcmp(mode,"raster")?50:100)){snprintf(error,cap,"Document exceeds the page limit (50 raster / 100 text)");goto done;}
    pages=cJSON_CreateArray();
    for(i=1;i<=count;i++){
        snprintf(page,sizeof(page),"%d",i);snprintf(output,sizeof(output),"%s/page-%d",dir,i);
        if(!strcmp(mode,"raster")){
            char width[32],pgm[4300];const char *args[14];cJSON *image;
            snprintf(width,sizeof(width),"%d",dots*2<1664?dots*2:1664);
            args[0]="pdftoppm";args[1]="-f";args[2]=page;args[3]="-l";args[4]=page;args[5]="-gray";args[6]="-singlefile";args[7]="-scale-to-x";args[8]=width;args[9]="-scale-to-y";args[10]="-1";args[11]=pdf;args[12]=output;args[13]=NULL;
            if(bp_run(args,NULL,25,error,cap))goto done;snprintf(pgm,sizeof(pgm),"%s.pgm",output);image=raster_page(pgm,dots);
            if(!image){snprintf(error,cap,"PDF raster page exceeds the supported dimensions");goto done;}cJSON_AddItemToArray(pages,image);remove(pgm);
        }else{
            const char *args[]={"pdftotext","-layout","-f",page,"-l",page,pdf,output,NULL};
            if(bp_run(args,NULL,12,error,cap))goto done;text=readfile(output,2000000,&n);if(!text){snprintf(error,cap,"Cannot read extracted PDF text");goto done;}
            if(n>20000)n=20000;while(n&&(text[n-1]=='\f'||text[n-1]=='\r'||text[n-1]=='\n'||text[n-1]==' '))n--;text[n]=0;
            cJSON_AddItemToArray(pages,cJSON_CreateString((char *)text));free(text);text=NULL;remove(output);
        }
    }
    result=cJSON_CreateObject();{const char *base=strrchr(name,'/'),*windows=strrchr(name,'\\');if(windows&&(!base||windows>base))base=windows;cJSON_AddStringToObject(result,"filename",base?base+1:name);}
    cJSON_AddStringToObject(result,"mode",mode);cJSON_AddItemToObject(result,"pages",pages);pages=NULL;goto done;
invalid:snprintf(error,cap,"Send PDF/Office up to 10 MB using text or raster mode");
done:free(text);bp_free(&decoded);cJSON_Delete(pages);if(*dir)cleanup(dir,0);return result;
}
