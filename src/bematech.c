#include "bematech.h"
#include <stdlib.h>
#include <string.h>
#include <limits.h>

bp_options bp_defaults(void) { bp_options o = {48,576,17,3,1}; return o; }
void bp_free(bp_buffer *b) { free(b->data); memset(b,0,sizeof(*b)); }
int bp_append(bp_buffer *b, const void *p, size_t n) {
    size_t cap; void *next;
    if (n > BP_MAX_JOB || b->len > BP_MAX_JOB-n) return -1;
    if (b->len+n > b->cap) {
        cap = b->cap ? b->cap : 256;
        while (cap < b->len+n) cap *= 2;
        next = realloc(b->data,cap); if (!next) return -1;
        b->data = next; b->cap = cap;
    }
    if(n) memcpy(b->data+b->len,p,n);
    b->len += n; return 0;
}
static int valid(const bp_options *o) {
    return o && o->columns>=20 && o->columns<=120 && o->dots>=320 && o->dots<=832 &&
        o->spacing>=1 && o->spacing<=60 && o->feed>=0 && o->feed<=20 && (o->cut==0 || o->cut==1);
}
static int finish(bp_buffer *b, const bp_options *o) {
    int i; const uint8_t cut[]={27,'w',0};
    for(i=0;i<o->feed;i++) if(bp_append(b,"\n",1))return -1;
    return o->cut ? bp_append(b,cut,sizeof(cut)) : 0;
}
static const uint16_t cp850[128]={
  0x00c7,0x00fc,0x00e9,0x00e2,0x00e4,0x00e0,0x00e5,0x00e7,
  0x00ea,0x00eb,0x00e8,0x00ef,0x00ee,0x00ec,0x00c4,0x00c5,
  0x00c9,0x00e6,0x00c6,0x00f4,0x00f6,0x00f2,0x00fb,0x00f9,
  0x00ff,0x00d6,0x00dc,0x00f8,0x00a3,0x00d8,0x00d7,0x0192,
  0x00e1,0x00ed,0x00f3,0x00fa,0x00f1,0x00d1,0x00aa,0x00ba,
  0x00bf,0x00ae,0x00ac,0x00bd,0x00bc,0x00a1,0x00ab,0x00bb,
  0x2591,0x2592,0x2593,0x2502,0x2524,0x00c1,0x00c2,0x00c0,
  0x00a9,0x2563,0x2551,0x2557,0x255d,0x00a2,0x00a5,0x2510,
  0x2514,0x2534,0x252c,0x251c,0x2500,0x253c,0x00e3,0x00c3,
  0x255a,0x2554,0x2569,0x2566,0x2560,0x2550,0x256c,0x00a4,
  0x00f0,0x00d0,0x00ca,0x00cb,0x00c8,0x0131,0x00cd,0x00ce,
  0x00cf,0x2518,0x250c,0x2588,0x2584,0x00a6,0x00cc,0x2580,
  0x00d3,0x00df,0x00d4,0x00d2,0x00f5,0x00d5,0x00b5,0x00fe,
  0x00de,0x00da,0x00db,0x00d9,0x00fd,0x00dd,0x00af,0x00b4,
  0x00ad,0x00b1,0x2017,0x00be,0x00b6,0x00a7,0x00f7,0x00b8,
  0x00b0,0x00a8,0x00b7,0x00b9,0x00b3,0x00b2,0x25a0,0x00a0
};
static int next_char(const unsigned char **p, unsigned *cp) {
    unsigned a=*(*p)++, n, i, c;
    if(a<128){*cp=a;return 0;}
    if(a>=0xc2 && a<=0xdf){n=1;c=a&31;}
    else if(a>=0xe0 && a<=0xef){n=2;c=a&15;}
    else if(a>=0xf0 && a<=0xf4){n=3;c=a&7;}
    else return -1;
    for(i=0;i<n;i++){a=**p;if(a<0x80 || a>0xbf)return -1;(*p)++;c=(c<<6)|(a&63);}
    if((n==1 && c<128)||(n==2 && c<2048)||(n==3 && c<65536)||c>0x10ffff||(c>=0xd800&&c<=0xdfff))return -1;
    *cp=c;return 0;
}
int bp_cp850(bp_buffer *out,const char *text,int replace_unsupported){
    const unsigned char *p=(const unsigned char *)text;unsigned c;int i;uint8_t byte;
    if(!text)return -1;
    while(*p){
        if(next_char(&p,&c))return -1;
        if(c<32||c==127)return -1;
        byte=0;if(c<127)byte=(uint8_t)c;
        else for(i=0;i<128;i++)if(cp850[i]==c){byte=(uint8_t)(128+i);break;}
        if(!byte){if(!replace_unsupported)return -2;byte='?';}
        if(bp_append(out,&byte,1))return -1;
    }return 0;
}
int bp_text(bp_buffer *out, const char *text, const bp_options *o) {
    const unsigned char *p=(const unsigned char *)text; unsigned c; int col=0,i; uint8_t byte;
    const uint8_t init[]={27,'@',27,'t',2};
    if(!text || !*text || !valid(o) || bp_append(out,init,sizeof(init)))return -1;
    while(*p){
        if(next_char(&p,&c))return -1;
        if(c=='\r'){if(*p=='\n')p++;c='\n';}
        if(c=='\n'){if(bp_append(out,"\n",1))return -1;col=0;continue;}
        if(c=='\t'){int spaces=4-(col%4);while(spaces--){if(col>=o->columns){if(bp_append(out,"\n",1))return -1;col=0;}if(bp_append(out," ",1))return -1;col++;}continue;}
        if(c<32 || c==127)return -1; /* Never allow embedded device commands. */
        if(col>=o->columns){if(bp_append(out,"\n",1))return -1;col=0;}
        byte=0;
        if(c<127)byte=(uint8_t)c;
        else for(i=0;i<128;i++)if(cp850[i]==c){byte=(uint8_t)(128+i);break;}
        if(!byte)return -1; /* Use the browser bitmap path for other Unicode. */
        if(bp_append(out,&byte,1))return -1;
        col++;
    }
    return finish(out,o);
}
int bp_bitmap(bp_buffer *out,const uint8_t *pixels,size_t size,unsigned w,unsigned h,const bp_options *o){
    unsigned band,x,k,bit,y; size_t row; uint8_t b,head[5];
    const uint8_t init[]={27,'@',27,'t',2}; const uint8_t reset[]={27,'2'};
    if(!valid(o)||!pixels||!w||w>(unsigned)o->dots||!h||h>6000)return -1;
    row=(w+7)/8;if(size!=row*h)return -1;
    if(bp_append(out,init,sizeof(init)))return -1;
    head[0]=27;head[1]='3';head[2]=(uint8_t)o->spacing;
    if(bp_append(out,head,3))return -1;
    head[0]=27;head[1]='*';head[2]=33;head[3]=(uint8_t)w;head[4]=(uint8_t)(w>>8);
    for(band=0;band<h;band+=24){
        if(bp_append(out,head,5))return -1;
        for(x=0;x<w;x++)for(k=0;k<3;k++){
            b=0;for(bit=0;bit<8;bit++){y=band+k*8+bit;if(y<h && (pixels[y*row+x/8]&(128>>(x%8))))b|=(uint8_t)(128>>bit);}
            if(bp_append(out,&b,1))return -1;
        }
        if(bp_append(out,"\n",1))return -1;
    }
    if(bp_append(out,reset,sizeof(reset)))return -1;
    return finish(out,o);
}
static int number(const uint8_t **p,const uint8_t *end,unsigned *n){
    *n=0;
    for(;;){while(*p<end && (**p==' '||**p=='\t'||**p=='\n'||**p=='\r'))(*p)++;
        if(*p<end && **p=='#'){while(*p<end && **p!='\n')(*p)++;}else break;}
    if(*p==end||**p<'0'||**p>'9')return -1;
    while(*p<end && **p>='0'&&**p<='9'){if(*n>100000)return -1;*n=*n*10+*(*p)++-'0';}
    return 0;
}
int bp_pbm(bp_buffer *out,const uint8_t *p,size_t size,const bp_options *o){
    const uint8_t *end=p+size;unsigned w,h;
    if(size<7||p[0]!='P'||p[1]!='4')return -1;p+=2;
    if(number(&p,end,&w)||number(&p,end,&h)||p==end)return -1;
    if(*p!=' '&&*p!='\n'&&*p!='\r'&&*p!='\t')return -1;
    if(*p++=='\r'&&p<end&&*p=='\n')p++;
    return bp_bitmap(out,p,(size_t)(end-p),w,h,o);
}
