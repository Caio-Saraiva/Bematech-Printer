#ifndef _WIN32
#define _POSIX_C_SOURCE 200809L
#endif
#include "native.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <errno.h>
#include <sys/stat.h>
#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <direct.h>
#define MKDIR(p) _mkdir(p)
#else
#include <unistd.h>
#define MKDIR(p) mkdir(p,0700)
#endif

const char *bp_string(const cJSON *o,const char *key,const char *fallback){
    cJSON *v=cJSON_GetObjectItemCaseSensitive(o,key);return cJSON_IsString(v)?v->valuestring:fallback;
}
double bp_number(const cJSON *o,const char *key,double fallback){
    cJSON *v=cJSON_GetObjectItemCaseSensitive(o,key);return cJSON_IsNumber(v)&&isfinite(v->valuedouble)?v->valuedouble:fallback;
}
int bp_boolean(const cJSON *o,const char *key,int fallback){
    cJSON *v=cJSON_GetObjectItemCaseSensitive(o,key);return cJSON_IsBool(v)?cJSON_IsTrue(v):fallback;
}
static void set(cJSON *o,const char *key,cJSON *value){
    if(cJSON_HasObjectItem(o,key))cJSON_ReplaceItemInObjectCaseSensitive(o,key,value);
    else cJSON_AddItemToObject(o,key,value);
}
void bp_reply_json(bp_response *r,int status,cJSON *value){
    char *text=cJSON_PrintUnformatted(value);
    r->status=status;r->type="application/json; charset=utf-8";
    if(text){bp_append(&r->body,text,strlen(text));cJSON_free(text);}
    else {r->status=500;bp_append(&r->body,"{\"error\":\"Out of memory\"}",25);}
    cJSON_Delete(value);
}
void bp_reply_error(bp_response *r,int status,const char *message){
    cJSON *v=cJSON_CreateObject();cJSON_AddStringToObject(v,"error",message);bp_reply_json(r,status,v);
}
static int b64char(unsigned char ch){
    if(ch>='A'&&ch<='Z')return ch-'A';
    if(ch>='a'&&ch<='z')return ch-'a'+26;
    if(ch>='0'&&ch<='9')return ch-'0'+52;
    if(ch=='+')return 62;if(ch=='/')return 63;return -1;
}
int bp_base64_decode(const char *s,bp_buffer *out){
    size_t n=strlen(s),i;int a,b,c,d;uint8_t bytes[3];
    if(n%4||n>16000000)return -1;
    for(i=0;i<n;i+=4){
        a=b64char((unsigned char)s[i]);b=b64char((unsigned char)s[i+1]);
        c=s[i+2]=='='?-2:b64char((unsigned char)s[i+2]);
        d=s[i+3]=='='?-2:b64char((unsigned char)s[i+3]);
        if(a<0||b<0||c==-1||d==-1||(c==-2&&d!=-2)||((c==-2||d==-2)&&i+4!=n))return -1;
        bytes[0]=(uint8_t)((a<<2)|(b>>4));
        if(c==-2){if(b&15)return -1;if(bp_append(out,bytes,1))return -1;continue;}
        bytes[1]=(uint8_t)((b<<4)|(c>>2));
        if(d==-2){if(c&3)return -1;if(bp_append(out,bytes,2))return -1;continue;}
        bytes[2]=(uint8_t)((c<<6)|d);if(bp_append(out,bytes,3))return -1;
    }return 0;
}
char *bp_base64_encode(const uint8_t *p,size_t n){
    static const char alphabet[]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    size_t i,k=0;char *s;if(n>BP_MAX_JOB)return NULL;s=malloc((n+2)/3*4+1);if(!s)return NULL;
    for(i=0;i<n;i+=3){unsigned v=(unsigned)p[i]<<16;if(i+1<n)v|=(unsigned)p[i+1]<<8;if(i+2<n)v|=p[i+2];
        s[k++]=alphabet[(v>>18)&63];s[k++]=alphabet[(v>>12)&63];s[k++]=i+1<n?alphabet[(v>>6)&63]:'=';s[k++]=i+2<n?alphabet[v&63]:'=';}
    s[k]=0;return s;
}
static int integer(const cJSON *v,int lo,int hi){return cJSON_IsNumber(v)&&isfinite(v->valuedouble)&&v->valuedouble>=lo&&v->valuedouble<=hi&&floor(v->valuedouble)==v->valuedouble;}
static const struct {const char *key;int def,lo,hi;} setting_rules[]={
    {"cols_a",48,20,80},{"cols_b",64,30,120},{"dots",576,320,832},{"image_width",576,8,832},
    {"line_spacing",17,1,60},{"default_feed",3,0,20},{"auto_cut",1,0,1},{"italic",1,0,1},
    {"condensed_esc",0,0,1},{"raster_fallback",1,0,1}
};
static int settings_valid(cJSON *settings){
    size_t i;cJSON *v;
    if(!cJSON_IsObject(settings))return 0;
    cJSON_ArrayForEach(v,settings){int found=0;
        for(i=0;i<sizeof(setting_rules)/sizeof(setting_rules[0]);i++){
            if(!strcmp(v->string,setting_rules[i].key)){
                if(!integer(v,setting_rules[i].lo,setting_rules[i].hi))return 0;
                found=1;break;
            }
        }
        if(!found)return 0;
    }
    return bp_number(settings,"image_width",576)<=bp_number(settings,"dots",576);
}
static void path_default(char *path,size_t n){
    const char *base;
#ifdef _WIN32
    base=getenv("APPDATA");if(!base)base=".";
    snprintf(path,n,"%s/Bematech-Printer/settings.json",base);
#elif defined(__APPLE__)
    base=getenv("HOME");if(!base)base=".";
    snprintf(path,n,"%s/Library/Application Support/Bematech-Printer/settings.json",base);
#else
    base=getenv("XDG_CONFIG_HOME");
    if(base&&*base)snprintf(path,n,"%s/bematech-printer/settings.json",base);
    else {base=getenv("HOME");if(!base)base=".";snprintf(path,n,"%s/.config/bematech-printer/settings.json",base);}
#endif
}
static int save(bp_app *app){
    char directory[4096],temporary[4140],*text,*p;FILE *f;size_t size;
    if(strlen(app->config)>=sizeof(directory))return -1;strcpy(directory,app->config);
    for(p=directory;*p;p++)if(*p=='\\')*p='/';
    p=strrchr(directory,'/');{char *backslash=strrchr(directory,'\\');if(backslash&&(!p||backslash>p))p=backslash;}
    if(p)*p=0;else directory[0]=0;
    if(*directory){
        p=directory+1;
#ifdef _WIN32
        if(directory[1]==':'&&directory[2]=='/')p=directory+3;
#endif
        for(;*p;p++)if(*p=='/'){char keep=*p;*p=0;if(MKDIR(directory)&&errno!=EEXIST)return -1;*p=keep;}
    }
    if(*directory&&MKDIR(directory)&&errno!=EEXIST)return -1;
    text=cJSON_PrintUnformatted(app->root);if(!text)return -1;size=strlen(text);
    snprintf(temporary,sizeof(temporary),"%s.tmp",app->config);f=fopen(temporary,"wb");
    if(!f){cJSON_free(text);return -1;}
    {int bad=fwrite(text,1,size,f)!=size; if(fclose(f))bad=1;cJSON_free(text);if(bad){remove(temporary);return -1;}}
#ifndef _WIN32
    chmod(temporary,0600);
    if(rename(temporary,app->config)){remove(temporary);return -1;}
#else
    if(!MoveFileExA(temporary,app->config,MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH)){remove(temporary);return -1;}
#endif
    return 0;
}
static cJSON *defaults(void){
    size_t i;cJSON *root=cJSON_CreateObject(),*settings=cJSON_CreateObject(),*conn=cJSON_CreateObject();
    for(i=0;i<sizeof(setting_rules)/sizeof(setting_rules[0]);i++)cJSON_AddNumberToObject(settings,setting_rules[i].key,setting_rules[i].def);
    cJSON_AddItemToObject(root,"settings",settings);
    cJSON_AddStringToObject(conn,"transport","simulation");cJSON_AddStringToObject(conn,"device","");
    cJSON_AddNumberToObject(conn,"baud",9600);cJSON_AddNumberToObject(conn,"data_bits",8);
    cJSON_AddStringToObject(conn,"parity","none");cJSON_AddNumberToObject(conn,"stop_bits",1);
    cJSON_AddItemToObject(root,"connection",conn);cJSON_AddItemToObject(root,"printers",cJSON_CreateArray());
    cJSON_AddItemToObject(root,"quotes",cJSON_CreateArray());cJSON_AddItemToObject(root,"jobs",cJSON_CreateArray());
    cJSON_AddNumberToObject(root,"counter",0);return root;
}
bp_options bp_app_options(bp_app *app){
    bp_options o=bp_defaults();cJSON *s=cJSON_GetObjectItemCaseSensitive(app->root,"settings");
    o.columns=(int)bp_number(s,"cols_a",48);o.dots=(int)bp_number(s,"dots",576);
    o.spacing=(int)bp_number(s,"line_spacing",17);o.feed=(int)bp_number(s,"default_feed",3);o.cut=(int)bp_number(s,"auto_cut",1);return o;
}
int bp_app_init(bp_app *app,const char *device,const bp_options *opt,const char *config,unsigned mask){
    FILE *f;long size;cJSON *loaded=NULL,*s,*conn;char *text;size_t i;
    memset(app,0,sizeof(*app));if(config){if(strlen(config)>=sizeof(app->config))return -1;strcpy(app->config,config);}else path_default(app->config,sizeof(app->config));
    app->root=defaults();if(!app->root)return -1;
    f=fopen(app->config,"rb");
    if(f){if(fseek(f,0,SEEK_END)){fclose(f);goto invalid;}size=ftell(f);if(size<0||size>16*1024*1024){fclose(f);goto invalid;}rewind(f);
        text=malloc((size_t)size+1);if(!text){fclose(f);goto invalid;}
        if(fread(text,1,(size_t)size,f)!=(size_t)size){free(text);fclose(f);goto invalid;}fclose(f);text[size]=0;
        loaded=cJSON_ParseWithLengthOpts(text,(size_t)size+1,NULL,1);free(text);
        if(!cJSON_IsObject(loaded))goto invalid;
        s=cJSON_GetObjectItemCaseSensitive(loaded,"settings");conn=cJSON_GetObjectItemCaseSensitive(loaded,"connection");
        if(!settings_valid(s)||!bp_connection_valid(conn))goto invalid;
        if(!cJSON_IsArray(cJSON_GetObjectItemCaseSensitive(loaded,"printers"))||!cJSON_IsArray(cJSON_GetObjectItemCaseSensitive(loaded,"quotes"))||!cJSON_IsArray(cJSON_GetObjectItemCaseSensitive(loaded,"jobs")))goto invalid;
        cJSON_Delete(app->root);app->root=loaded;loaded=NULL;
    }
    s=cJSON_GetObjectItemCaseSensitive(app->root,"settings");
    for(i=0;i<sizeof(setting_rules)/sizeof(setting_rules[0]);i++)if(!cJSON_HasObjectItem(s,setting_rules[i].key))cJSON_AddNumberToObject(s,setting_rules[i].key,setting_rules[i].def);
    if(mask&1)set(s,"cols_a",cJSON_CreateNumber(opt->columns));
    if(mask&2){set(s,"dots",cJSON_CreateNumber(opt->dots));set(s,"image_width",cJSON_CreateNumber(opt->dots));}
    if(mask&4)set(s,"line_spacing",cJSON_CreateNumber(opt->spacing));
    if(mask&8)set(s,"default_feed",cJSON_CreateNumber(opt->feed));
    if(mask&16)set(s,"auto_cut",cJSON_CreateNumber(opt->cut));
    conn=cJSON_GetObjectItemCaseSensitive(app->root,"connection");
    if(device){set(conn,"transport",cJSON_CreateString("serial"));set(conn,"device",cJSON_CreateString(device));if(!bp_connection_valid(conn))goto invalid;}
    app->next_job=(unsigned long)bp_number(app->root,"counter",0);
    return 0;
invalid:cJSON_Delete(loaded);cJSON_Delete(app->root);app->root=NULL;fputs("Invalid local settings. Preserve the file and correct it, or use --config with a new path.\n",stderr);return -1;
}
void bp_app_close(bp_app *app){cJSON_Delete(app->root);app->root=NULL;}
static int bitmap(bp_buffer *job,const cJSON *image,bp_options o){
    int w,h;size_t stride,i;bp_buffer decoded={0},rows={0};int result=-1;
    if(!integer(cJSON_GetObjectItemCaseSensitive(image,"width"),1,o.dots)||!integer(cJSON_GetObjectItemCaseSensitive(image,"height"),1,6000))return -1;
    w=(int)bp_number(image,"width",0);h=(int)bp_number(image,"height",0);stride=((unsigned)w+7)/8;
    if(bp_base64_decode(bp_string(image,"data_base64","!"),&decoded))goto done;
    if(!strcmp(bp_string(image,"packing","continuous"),"row")){
        if(decoded.len!=stride*(size_t)h)goto done;
        rows=decoded;memset(&decoded,0,sizeof(decoded));
    }else{
        if(decoded.len!=((size_t)w*(size_t)h+7)/8)goto done;
        rows.data=calloc(stride*(size_t)h,1);if(!rows.data)goto done;rows.len=rows.cap=stride*(size_t)h;
        for(i=0;i<(size_t)w*(size_t)h;i++)if(decoded.data[i/8]&(128>>(i%8)))rows.data[(i/(size_t)w)*stride+(i%(size_t)w)/8]|=(uint8_t)(128>>(i%(size_t)w%8));
    }
    /* Center smaller images exactly as the original ESC/Bema implementation. */
    if(w<o.dots){
        size_t y,x,full_stride=((unsigned)o.dots+7)/8;uint8_t *centered=calloc(full_stride*(size_t)h,1);unsigned margin=(unsigned)(o.dots-w)/2;
        if(!centered)goto done;
        for(y=0;y<(size_t)h;y++)for(x=0;x<(size_t)w;x++)if(rows.data[y*stride+x/8]&(128>>(x%8)))centered[y*full_stride+(x+margin)/8]|=(uint8_t)(128>>((x+margin)%8));
        result=bp_bitmap(job,centered,full_stride*(size_t)h,(unsigned)o.dots,(unsigned)h,&o);free(centered);
    }else result=bp_bitmap(job,rows.data,rows.len,(unsigned)w,(unsigned)h,&o);
done:bp_free(&decoded);bp_free(&rows);return result;
}
static int line(bp_buffer *b,const char *s){return bp_append(b,s,strlen(s))||bp_append(b,"\n",1);}
static int band(bp_buffer *b,int width,int spacing){
    unsigned char h[]={27,'3',(uint8_t)spacing,27,'*',33,(uint8_t)width,(uint8_t)(width>>8)};
    uint8_t black=255;int i;if(bp_append(b,h,sizeof(h)))return -1;
    for(i=0;i<width*3;i++)if(bp_append(b,&black,1))return -1;
    return bp_append(b,"\n\x1b""2",3);
}
static const char *cal_key(const char *kind){
    if(!strcmp(kind,"columns_normal"))return "cols_a";
    if(!strcmp(kind,"columns_condensed"))return "cols_b";
    if(!strcmp(kind,"width"))return "dots";
    if(!strcmp(kind,"line_spacing"))return "line_spacing";return NULL;
}
static int calibration(bp_buffer *job,const cJSON *body,bp_options o){
    const char *kind=bp_string(body,"kind","");const char *key=cal_key(kind);
    cJSON *numbers=cJSON_GetObjectItemCaseSensitive(body,"candidates"),*v;int lo=1,hi=60,count=0;char text[256];
    if(!key||!cJSON_IsArray(numbers)||cJSON_GetArraySize(numbers)<1||cJSON_GetArraySize(numbers)>17)return -1;
    if(!strcmp(kind,"columns_normal")){lo=20;hi=80;}else if(!strcmp(kind,"columns_condensed")){lo=30;hi=120;}else if(!strcmp(kind,"width")){lo=320;hi=832;}
    cJSON_ArrayForEach(v,numbers)if(!integer(v,lo,hi))return -1;
    if(bp_append(job,"\x1b@\x1bt\x02",5)||line(job,"BEMATECH CALIBRATION")||line(job,kind))return -1;
    if(!strcmp(kind,"columns_condensed")&&bp_append(job,"\x1bM\x01",3))return -1;
    cJSON_ArrayForEach(v,numbers){int n=v->valueint;snprintf(text,sizeof(text),"\n%d",n);if(line(job,text))return -1;
        if(!strcmp(kind,"columns_normal")||!strcmp(kind,"columns_condensed")){
            int i;text[0]='[';for(i=1;i<n-1;i++)text[i]=(char)('0'+i%10);text[n-1]=']';text[n]=0;if(line(job,text))return -1;
        }else {int j,repeats=!strcmp(kind,"width")?2:6;for(j=0;j<repeats;j++)if(band(job,!strcmp(kind,"width")?n:o.dots,!strcmp(kind,"width")?17:n))return -1;}
        count++;
    }
    if(!strcmp(kind,"columns_condensed")&&bp_append(job,"\x1bM\x00",3))return -1;
    return count?line(job,"\nInspect the paper before applying a value."):-1;
}
static int command(bp_buffer *job,const uint8_t *bytes,size_t n){return bp_append(job,bytes,n);}
static int rich_job(bp_buffer *job,const cJSON *body,const cJSON *settings,bp_options o){
    cJSON *lines=cJSON_GetObjectItemCaseSensitive(body,"rich_lines"),*row,*part;
    int expanded=bp_boolean(body,"expanded",0),condensed=bp_boolean(body,"condensed",0)&&(int)bp_number(settings,"condensed_esc",0);
    int columns=(int)bp_number(settings,condensed?"cols_b":"cols_a",48),bold=0,italic=0,underline=0,total=0;
    int replace=!(int)bp_number(settings,"raster_fallback",1),italic_enabled=(int)bp_number(settings,"italic",1),i;
    const uint8_t init[]={27,'@',27,'t',2},wide[]={14},narrow[]={27,'M',1};
    if(!cJSON_IsArray(lines)||cJSON_GetArraySize(lines)>2000||!cJSON_GetArraySize(lines))return -1;
    if(expanded)columns/=2;
    if(command(job,init,sizeof(init)))return -1;
    if(expanded&&command(job,wide,sizeof(wide)))return -1;
    if(condensed&&command(job,narrow,sizeof(narrow)))return -1;
    cJSON_ArrayForEach(row,lines){
        const char *align=bp_string(row,"align","left");cJSON *parts=cJSON_GetObjectItemCaseSensitive(row,"parts");int rowlen=0;
        uint8_t a[]={27,'a',0};if(!strcmp(align,"center"))a[2]=1;else if(!strcmp(align,"right"))a[2]=2;else if(strcmp(align,"left"))return -1;
        if(!cJSON_IsArray(parts)||cJSON_GetArraySize(parts)>256||command(job,a,sizeof(a)))return -1;
        cJSON_ArrayForEach(part,parts){
            const char *text=bp_string(part,"text","");bp_buffer encoded={0};int b=bp_boolean(part,"bold",0),it=bp_boolean(part,"italic",0)&&italic_enabled,u=bp_boolean(part,"underline",0),result;
            if(strlen(text)>40000)return -1;
            result=bp_cp850(&encoded,text,replace);if(result){bp_free(&encoded);return result;}
            rowlen+=(int)encoded.len;total+=(int)encoded.len;
            if(total>80000){bp_free(&encoded);return -1;}
            if(rowlen>columns){bp_free(&encoded);return -2;}
            if(b!=bold){uint8_t c[]={27,(uint8_t)(b?'E':'F')};if(command(job,c,sizeof(c))){bp_free(&encoded);return -1;}bold=b;}
            if(it!=italic){uint8_t c[]={27,(uint8_t)(it?'4':'5')};if(command(job,c,sizeof(c))){bp_free(&encoded);return -1;}italic=it;}
            if(u!=underline){uint8_t c[]={27,'-',(uint8_t)u};if(command(job,c,sizeof(c))){bp_free(&encoded);return -1;}underline=u;}
            result=bp_append(job,encoded.data,encoded.len);bp_free(&encoded);if(result)return -1;
        }
        if(bp_append(job,"\n",1))return -1;
    }
    if(bold&&bp_append(job,"\x1b""F",2))return -1;
    if(italic&&bp_append(job,"\x1b""5",2))return -1;
    if(underline&&bp_append(job,"\x1b-\x00",3))return -1;
    if(expanded&&bp_append(job,"\x14",1))return -1;
    if(condensed&&bp_append(job,"\x1bM\x00",3))return -1;
    for(i=0;i<o.feed;i++)if(bp_append(job,"\n",1))return -1;
    if(o.cut&&bp_append(job,"\x1bw\x00",3))return -1;return 0;
}

static void trim(cJSON *array,int max){while(cJSON_GetArraySize(array)>max)cJSON_DeleteItemFromArray(array,0);}
static void sent(bp_app *app,const char *kind,bp_buffer *job,bp_response *reply){
    char error[256];cJSON *conn=cJSON_GetObjectItemCaseSensitive(app->root,"connection"),*entry=cJSON_CreateObject(),*result=cJSON_CreateObject(),*jobs=cJSON_GetObjectItemCaseSensitive(app->root,"jobs");
    int simulated=!strcmp(bp_string(conn,"transport","simulation"),"simulation"),ok=1;unsigned long id=++app->next_job;
    if(job->len>4u*1024u*1024u){cJSON_Delete(entry);cJSON_Delete(result);bp_reply_error(reply,400,"Encoded job exceeds 4 MiB");return;}
    if(!simulated&&bp_connection_send(conn,job->data,job->len,error,sizeof(error)))ok=0;
    cJSON_AddNumberToObject(entry,"id",(double)id);cJSON_AddNumberToObject(entry,"created_at",(double)time(NULL));
    cJSON_AddStringToObject(entry,"kind",kind);cJSON_AddNumberToObject(entry,"bytes",(double)job->len);
    cJSON_AddStringToObject(entry,"status",ok?(simulated?"simulated":"sent"):"failed");
    if(!ok)cJSON_AddStringToObject(entry,"detail",error);
    cJSON_AddItemToArray(jobs,entry);trim(jobs,100);set(app->root,"counter",cJSON_CreateNumber((double)id));
    /* A failed metadata save must never cause an automatic second physical job. */
    if(save(app))fputs("Warning: could not persist job history.\n",stderr);
    if(!ok){cJSON_Delete(result);bp_reply_error(reply,500,error);return;}
    cJSON_AddNumberToObject(result,"id",(double)id);cJSON_AddStringToObject(result,"status",simulated?"simulated":"sent");cJSON_AddNumberToObject(result,"bytes",(double)job->len);bp_reply_json(reply,202,result);
}
static cJSON *printers(bp_app *app){
    cJSON *out=cJSON_CreateArray(),*v,*p;
    p=cJSON_CreateObject();cJSON_AddStringToObject(p,"name","Bambu Lab A1");cJSON_AddNumberToObject(p,"power_w",95);cJSON_AddNumberToObject(p,"max_power_w",1300);cJSON_AddStringToObject(p,"note","95 W reference average; maximum 1300 W at 220 V.");cJSON_AddItemToArray(out,p);
    p=cJSON_CreateObject();cJSON_AddStringToObject(p,"name","Bambu Lab A1 mini");cJSON_AddNumberToObject(p,"power_w",80);cJSON_AddNumberToObject(p,"max_power_w",150);cJSON_AddStringToObject(p,"note","80 W reference average; maximum 150 W.");cJSON_AddItemToArray(out,p);
    cJSON_ArrayForEach(v,cJSON_GetObjectItemCaseSensitive(app->root,"printers"))cJSON_AddItemToArray(out,cJSON_Duplicate(v,1));return out;
}
static void csv_cell(bp_buffer *b,const cJSON *v){
    char number[64];const char *s;size_t i;uint8_t quote='"';
    if(cJSON_IsNumber(v)){snprintf(number,sizeof(number),"%.12g",v->valuedouble);s=number;}else s=cJSON_IsString(v)?v->valuestring:"";
    bp_append(b,&quote,1);
    if(cJSON_IsString(v)){const char *p=s;while(*p==' '||*p=='\t'||*p=='\r'||*p=='\n')p++;if(strchr("=+-@",*p)&&*p)bp_append(b,"'",1);}
    for(i=0;s[i];i++){if(s[i]=='"')bp_append(b,&quote,1);bp_append(b,s+i,1);}bp_append(b,&quote,1);
}
static void csv(bp_app *app,bp_response *r){
    const char *headers="data;material;preco_kg;peso_g;quantidade_pecas;impressora;potencia_w;tempo_horas;tarifa_kwh;custo_material;custo_energia;custo_maquina;mao_obra;embalagem;outros_custos;reserva_falha_pct;custo_total;margem_alvo_pct;taxa_pagamento_pct;preco_tabela;desconto_pct;preco_final;lucro_final;margem_efetiva_pct\r\n";
    const char *keys[]={"material","priceKg","weight","quantity","printer","power","hours","tariff","materialCost","energyCost","machineCost","laborCost","packaging","other","failureReserve","totalCost","margin","paymentFee","listPrice","discount","finalPrice","profit","effectiveMargin"};
    const int results[]={0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,1,0,0,1,0,1,1,1};
    cJSON *quotes=cJSON_GetObjectItemCaseSensitive(app->root,"quotes");int i,j;r->status=200;r->type="text/csv; charset=utf-8";
    bp_append(&r->body,"\xef\xbb\xbf",3);bp_append(&r->body,headers,strlen(headers));
    for(i=cJSON_GetArraySize(quotes)-1;i>=0;i--){
        cJSON *q=cJSON_GetArrayItem(quotes,i),*data=cJSON_GetObjectItemCaseSensitive(q,"data"),*result=cJSON_GetObjectItemCaseSensitive(q,"result");
        char date[32];time_t ts=(time_t)bp_number(q,"created_at",0);struct tm *tm=localtime(&ts);strftime(date,sizeof(date),"%Y-%m-%d %H:%M:%S",tm);bp_append(&r->body,date,strlen(date));
        for(j=0;j<23;j++){bp_append(&r->body,";",1);csv_cell(&r->body,cJSON_GetObjectItemCaseSensitive(results[j]?result:data,keys[j]));}bp_append(&r->body,"\r\n",2);
    }
}
void bp_app_request(bp_app *app,const char *method,const char *path,const void *raw,size_t size,bp_response *r){
    cJSON *body=NULL,*s=cJSON_GetObjectItemCaseSensitive(app->root,"settings"),*conn=cJSON_GetObjectItemCaseSensitive(app->root,"connection"),*result=NULL,*v;
    bp_options o=bp_app_options(app);bp_buffer job={0};char error[512];int code=0;
    memset(r,0,sizeof(*r));r->status=404;r->type="application/json";
    if(!strcmp(method,"GET")){
        if(!strcmp(path,"/api/info")){result=cJSON_CreateObject();cJSON_AddStringToObject(result,"version",BP_VERSION);cJSON_AddStringToObject(result,"mode",bp_string(conn,"transport","simulation"));cJSON_AddNumberToObject(result,"dots",o.dots);cJSON_AddNumberToObject(result,"columns",o.columns);cJSON_AddNumberToObject(result,"spacing",o.spacing);cJSON_AddNumberToObject(result,"feed",o.feed);cJSON_AddBoolToObject(result,"cut",o.cut);goto ok;}
        if(!strcmp(path,"/api/settings")){result=cJSON_Duplicate(s,1);goto ok;}
        if(!strcmp(path,"/api/connection")){result=cJSON_Duplicate(conn,1);cJSON_AddStringToObject(result,"config_path",app->config);goto ok;}
        if(!strcmp(path,"/api/devices")){result=cJSON_CreateObject();cJSON_AddItemToObject(result,"devices",bp_device_list());goto ok;}
        if(!strcmp(path,"/api/status")){result=cJSON_CreateObject();cJSON_AddStringToObject(result,"configured_device",bp_string(conn,"device",""));cJSON_AddStringToObject(result,"transport",bp_string(conn,"transport","simulation"));cJSON_AddStringToObject(result,"state",!strcmp(bp_string(conn,"transport","simulation"),"simulation")?"simulation":"configured");cJSON_AddStringToObject(result,"message","Use Test connection to check access without printing.");goto ok;}
        if(!strcmp(path,"/api/jobs")){cJSON *jobs=cJSON_GetObjectItemCaseSensitive(app->root,"jobs"),*a=cJSON_CreateArray();int i;for(i=cJSON_GetArraySize(jobs)-1;i>=0&&cJSON_GetArraySize(a)<20;i--)cJSON_AddItemToArray(a,cJSON_Duplicate(cJSON_GetArrayItem(jobs,i),1));result=cJSON_CreateObject();cJSON_AddItemToObject(result,"jobs",a);goto ok;}
        if(!strcmp(path,"/api/server-diagnostic")){result=bp_diagnostic();goto ok;}
        if(!strcmp(path,"/api/calculator/printers")){result=cJSON_CreateObject();cJSON_AddItemToObject(result,"printers",printers(app));goto ok;}
        if(!strcmp(path,"/api/calculator/history")){cJSON *quotes=cJSON_GetObjectItemCaseSensitive(app->root,"quotes"),*out=cJSON_CreateArray();int i;for(i=cJSON_GetArraySize(quotes)-1;i>=0;i--)cJSON_AddItemToArray(out,cJSON_Duplicate(cJSON_GetArrayItem(quotes,i),1));result=cJSON_CreateObject();cJSON_AddItemToObject(result,"quotes",out);goto ok;}
        if(!strcmp(path,"/api/calculator/history.csv")){csv(app,r);return;}
        bp_reply_error(r,404,"Unknown local API route");return;
    }
    if(strcmp(method,"POST")){bp_reply_error(r,405,"Method not supported");return;}
    if(strcmp(path,"/api/print")&&strcmp(path,"/api/text")){
        body=size?cJSON_ParseWithLengthOpts(raw,size+1,NULL,1):cJSON_CreateObject();
        if(!cJSON_IsObject(body)){bp_reply_error(r,400,"Expected a JSON object");cJSON_Delete(body);return;}
    }
    if(!strcmp(path,"/api/settings")||!strcmp(path,"/api/calibration/apply")){
        cJSON *updated=cJSON_Duplicate(s,1);
        if(!strcmp(path,"/api/calibration/apply")){
            const char *key=cal_key(bp_string(body,"kind",""));v=cJSON_GetObjectItemCaseSensitive(body,"value");
            if(!key||!cJSON_IsNumber(v)){cJSON_Delete(updated);goto invalid;}set(updated,key,cJSON_Duplicate(v,1));
            if(!strcmp(key,"dots")&&bp_number(s,"image_width",576)>=bp_number(s,"dots",576))set(updated,"image_width",cJSON_Duplicate(v,1));
        }else {cJSON_ArrayForEach(v,body){if(!v->string){cJSON_Delete(updated);goto invalid;}set(updated,v->string,cJSON_Duplicate(v,1));}}
        if(!settings_valid(updated)){cJSON_Delete(updated);goto invalid;}
        set(app->root,"settings",updated);if(save(app))goto write_error;
        result=cJSON_CreateObject();cJSON_AddBoolToObject(result,"ok",1);cJSON_AddItemToObject(result,"settings",cJSON_Duplicate(updated,1));goto ok;
    }
    if(!strcmp(path,"/api/connection")){
        if(!bp_connection_valid(body))goto invalid;
        set(app->root,"connection",cJSON_Duplicate(body,1));if(save(app))goto write_error;
        result=cJSON_Duplicate(body,1);cJSON_AddBoolToObject(result,"ok",1);goto ok;
    }
    if(!strcmp(path,"/api/connection/test")){
        if(bp_connection_probe(conn,error,sizeof(error))){bp_reply_error(r,400,error);goto done;}
        result=cJSON_CreateObject();cJSON_AddBoolToObject(result,"ok",1);cJSON_AddStringToObject(result,"state",!strcmp(bp_string(conn,"transport","simulation"),"simulation")?"simulation":"connected");goto ok;
    }
    if(!strcmp(path,"/api/calculator/printers")){
        const char *name=bp_string(body,"name",""),*note=bp_string(body,"note","");
        double power=bp_number(body,"power_w",0),maximum=bp_number(body,"max_power_w",0);cJSON *all=printers(app),*custom=cJSON_GetObjectItemCaseSensitive(app->root,"printers");
        if(!*name||strlen(name)>80||strlen(note)>240||power<1||power>5000||maximum<0||maximum>10000||cJSON_GetArraySize(custom)>=100){cJSON_Delete(all);goto invalid;}
        cJSON_ArrayForEach(v,all)if(!strcmp(bp_string(v,"name",""),name)){cJSON_Delete(all);bp_reply_error(r,400,"A printer with this name already exists");goto done;}cJSON_Delete(all);
        cJSON_AddItemToArray(custom,cJSON_Duplicate(body,1));if(save(app))goto write_error;
        result=cJSON_CreateObject();cJSON_AddBoolToObject(result,"ok",1);cJSON_AddItemToObject(result,"printers",printers(app));code=201;goto ok;
    }
    if(!strcmp(path,"/api/calculator/quotes")){
        cJSON *data=cJSON_GetObjectItemCaseSensitive(body,"data"),*value=cJSON_GetObjectItemCaseSensitive(body,"result"),*quotes=cJSON_GetObjectItemCaseSensitive(app->root,"quotes");
        if(size>80000||!cJSON_IsObject(data)||!cJSON_IsObject(value))goto invalid;
        {int id=1;int n=cJSON_GetArraySize(quotes);if(n)id=(int)bp_number(cJSON_GetArrayItem(quotes,n-1),"id",0)+1;
            result=cJSON_CreateObject();cJSON_AddNumberToObject(result,"id",id);cJSON_AddNumberToObject(result,"created_at",(double)time(NULL));
            cJSON_AddItemToObject(result,"data",cJSON_Duplicate(data,1));cJSON_AddItemToObject(result,"result",cJSON_Duplicate(value,1));cJSON_AddItemToArray(quotes,result);trim(quotes,100);
            if(save(app))goto write_error;result=cJSON_CreateObject();cJSON_AddBoolToObject(result,"ok",1);cJSON_AddNumberToObject(result,"id",id);code=201;goto ok;}
    }
    if(!strcmp(path,"/api/document/read")){
        result=bp_read_document(body,o.dots,error,sizeof(error));if(!result){bp_reply_error(r,400,error);goto done;}goto ok;
    }
    if(cJSON_HasObjectItem(body,"feed")&&!integer(cJSON_GetObjectItemCaseSensitive(body,"feed"),0,20))goto invalid;
    if(cJSON_HasObjectItem(body,"gap")&&!integer(cJSON_GetObjectItemCaseSensitive(body,"gap"),0,12))goto invalid;
    if(!strcmp(path,"/api/feed")&&cJSON_HasObjectItem(body,"lines")&&!integer(cJSON_GetObjectItemCaseSensitive(body,"lines"),1,30))goto invalid;
    o.cut=bp_boolean(body,"cut",o.cut);o.feed=(int)bp_number(body,"feed",o.feed);
    if(o.feed<0||o.feed>20)goto invalid;
    if(!strcmp(path,"/api/print")){if(bp_pbm(&job,raw,size,&o))goto invalid;}
    else if(!strcmp(path,"/api/text")){if(memchr(raw,0,size)||bp_text(&job,raw,&o))goto invalid;}
    else if(!strcmp(path,"/api/print/text")){if(bp_text(&job,bp_string(body,"text",""),&o))goto invalid;}
    else if(!strcmp(path,"/api/print/image")){if(bitmap(&job,body,o))goto invalid;}
    else if(!strcmp(path,"/api/print/images")||!strcmp(path,"/api/print/document")||!strcmp(path,"/api/print/list-rich")){
        if(cJSON_HasObjectItem(body,"rich_lines")){
            int rich_result=rich_job(&job,body,s,o);
            if(rich_result==0){sent(app,path,&job,r);goto done;}
            bp_free(&job);if(rich_result!=-2)goto invalid;
        }
        cJSON *pages=cJSON_GetObjectItemCaseSensitive(body,"images");int count,i,gap=(int)bp_number(body,"gap",1);bp_options page_o=o;page_o.cut=0;page_o.feed=0;
        if(!pages)pages=cJSON_GetObjectItemCaseSensitive(body,"pages");count=cJSON_GetArraySize(pages);
        if(!cJSON_IsArray(pages)||count<1||count>100||gap<0||gap>12)goto invalid;
        for(i=0;i<count;i++){if(bitmap(&job,cJSON_GetArrayItem(pages,i),page_o))goto invalid;
            if(i+1<count){int j;for(j=0;j<gap;j++)if(bp_append(&job,"\n",1))goto invalid;}}
        for(i=0;i<o.feed;i++)if(bp_append(&job,"\n",1))goto invalid;
        if(o.cut&&bp_append(&job,"\x1bw\x00",3))goto invalid;
    }else if(!strcmp(path,"/api/calibration/print")){if(calibration(&job,body,o))goto invalid;}
    else if(!strcmp(path,"/api/feed")){int i,lines=(int)bp_number(body,"lines",5);if(lines<1||lines>30)goto invalid;for(i=0;i<lines;i++)if(bp_append(&job,"\n",1))goto invalid;}
    else if(!strcmp(path,"/api/cut")){if(bp_append(&job,"\n\n\n\n\x1bw\x00",7))goto invalid;}
    else if(!strcmp(path,"/api/print/raw")){if(bp_base64_decode(bp_string(body,"data_base64","!"),&job)||!job.len)goto invalid;}
    else if(!strcmp(path,"/api/print/test-page")){
        bp_options text_options=o;text_options.cut=0;text_options.feed=0;
        if(bp_text(&job,"MP-4200 TH\nPagina de teste\nAcentos: ação, coração, pão, ÚNICO\n0123456789012345678901234567890123456789\n",&text_options))goto invalid;
        {static const char styles[]="\x1b""E""Negrito\x1b""F\n\x1b-\x01""Sublinhado\x1b-\x00\n\x0e""Expandido\x14\n\x1bM\x01""Condensado\x1bM\x00\n";
        if(bp_append(&job,styles,sizeof(styles)-1))goto invalid;}
        {int i;for(i=0;i<o.feed;i++)if(bp_append(&job,"\n",1))goto invalid;if(o.cut&&bp_append(&job,"\x1bw\x00",3))goto invalid;}
    }else if(!strcmp(path,"/api/print/probe")){
        uint8_t pixels[288]={0};unsigned x,y;bp_options small=o;for(y=0;y<24;y++)for(x=0;x<96;x++)if((x/8+y/8)%2==0)pixels[y*12+x/8]|=(uint8_t)(128>>(x%8));
        if(bp_bitmap(&job,pixels,sizeof(pixels),96,24,&small))goto invalid;
    }else {bp_reply_error(r,404,"Unknown local API route");goto done;}
    if(!job.len)goto invalid;sent(app,path,&job,r);goto done;
write_error:bp_reply_error(r,500,"Could not save the local configuration. Check directory permissions.");goto done;
invalid:bp_reply_error(r,400,"Invalid input, dimensions, settings or print payload");goto done;
ok:bp_reply_json(r,code?code:200,result);
done:bp_free(&job);cJSON_Delete(body);
}
