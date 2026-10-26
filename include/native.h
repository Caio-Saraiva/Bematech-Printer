#ifndef BP_NATIVE_H
#define BP_NATIVE_H
#include "bematech.h"
#include "cJSON.h"
typedef struct {
    cJSON *root;
    char config[4096];
    unsigned long next_job;
} bp_app;
typedef struct { int status; const char *type; bp_buffer body; } bp_response;
int bp_app_init(bp_app *app,const char *device,const bp_options *opt,const char *config,unsigned overrides);
void bp_app_close(bp_app *app);
void bp_app_request(bp_app *app,const char *method,const char *path,const void *body,size_t size,bp_response *reply);
bp_options bp_app_options(bp_app *app);
const char *bp_string(const cJSON *object,const char *key,const char *fallback);
double bp_number(const cJSON *object,const char *key,double fallback);
int bp_boolean(const cJSON *object,const char *key,int fallback);
void bp_reply_json(bp_response *reply,int status,cJSON *value);
void bp_reply_error(bp_response *reply,int status,const char *message);
int bp_base64_decode(const char *text,bp_buffer *out);
char *bp_base64_encode(const uint8_t *data,size_t size);
cJSON *bp_device_list(void);
int bp_connection_valid(const cJSON *connection);
int bp_connection_send(const cJSON *connection,const uint8_t *data,size_t size,char *error,size_t error_size);
int bp_connection_probe(const cJSON *connection,char *error,size_t error_size);
cJSON *bp_diagnostic(void);
int bp_run(const char *const *args,const char *output,unsigned timeout,char *error,size_t error_size);
cJSON *bp_read_document(const cJSON *request,int dots,char *error,size_t error_size);
#endif
