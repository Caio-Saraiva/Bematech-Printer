#include "bematech.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#define CHECK(x) do { if(!(x)){fprintf(stderr,"FAIL %s:%d: %s\n",__FILE__,__LINE__,#x);exit(1);} } while(0)
int main(void){
    bp_options o=bp_defaults();bp_buffer b={0};uint8_t pixel=128;
    const uint8_t expected[]={27,'@',27,'t',2,'a',0x87,0xc6,'o','\n','\n','\n',27,'w',0};
    CHECK(bp_text(&b,"ação",&o)==0);CHECK(b.len==sizeof(expected));CHECK(!memcmp(b.data,expected,sizeof(expected)));bp_free(&b);
    CHECK(bp_text(&b,"malicious\x1b@",&o)<0);bp_free(&b);
    CHECK(bp_text(&b,"emoji 😀",&o)<0);bp_free(&b);
    CHECK(bp_text(&b,"\xc0\xaf",&o)<0);bp_free(&b);
    CHECK(bp_text(&b,"\xe2",&o)<0);bp_free(&b);
    CHECK(bp_bitmap(&b,&pixel,1,1,1,&o)==0);CHECK(b.data[13]==128);bp_free(&b);
    CHECK(bp_bitmap(&b,&pixel,0,1,1,&o)<0);bp_free(&b);
    CHECK(bp_bitmap(&b,&pixel,1,833,1,&o)<0);bp_free(&b);
    {const uint8_t pbm[]={'P','4','\n','1',' ','1','\n',0x0a};CHECK(bp_pbm(&b,pbm,sizeof(pbm),&o)==0);bp_free(&b);}
    {const uint8_t pbm[]={'P','4','\n','#','x','\n','1',' ','1','\n',0x80};CHECK(bp_pbm(&b,pbm,sizeof(pbm),&o)==0);bp_free(&b);}
    {const uint8_t pbm[]={'P','4','\n','1',' ','1','\n'};CHECK(bp_pbm(&b,pbm,sizeof(pbm),&o)<0);bp_free(&b);}
    o.columns=20;o.feed=0;o.cut=0;CHECK(bp_text(&b,"123456789012345678901",&o)==0);CHECK(b.data[25]=='\n');bp_free(&b);
    CHECK(bp_append(&b,"",BP_MAX_JOB+1)<0);bp_free(&b);
    puts("Core contracts passed: CP850, UTF-8 rejection, ESC injection, wrapping, P4 boundaries and image commands.");return 0;
}
