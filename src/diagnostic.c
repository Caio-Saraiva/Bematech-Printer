#if defined(__APPLE__)
#define _DARWIN_C_SOURCE 1
#elif !defined(_WIN32)
#define _DEFAULT_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif
#include "native.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <time.h>
#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#else
#include <unistd.h>
#include <sys/utsname.h>
#include <sys/statvfs.h>
#ifdef __APPLE__
#include <sys/sysctl.h>
#include <mach/mach.h>
#else
#include <sys/sysinfo.h>
#endif
#endif
static void pause_sample(void){
#ifdef _WIN32
    Sleep(100);
#else
    struct timespec delay={0,100000000};nanosleep(&delay,NULL);
#endif
}
static int cpu_sample(unsigned long long *total,unsigned long long *idle){
#ifdef _WIN32
    FILETIME i,k,u;ULARGE_INTEGER x,y,z;if(!GetSystemTimes(&i,&k,&u))return -1;
    x.LowPart=i.dwLowDateTime;x.HighPart=i.dwHighDateTime;y.LowPart=k.dwLowDateTime;y.HighPart=k.dwHighDateTime;z.LowPart=u.dwLowDateTime;z.HighPart=u.dwHighDateTime;
    *idle=x.QuadPart;*total=y.QuadPart+z.QuadPart;return 0;
#elif defined(__APPLE__)
    host_cpu_load_info_data_t ticks;mach_msg_type_number_t count=HOST_CPU_LOAD_INFO_COUNT;
    mach_port_t host=mach_host_self();kern_return_t ok=host_statistics(host,HOST_CPU_LOAD_INFO,(host_info_t)&ticks,&count);mach_port_deallocate(mach_task_self(),host);if(ok!=KERN_SUCCESS)return -1;
    *idle=ticks.cpu_ticks[CPU_STATE_IDLE];*total=(unsigned long long)ticks.cpu_ticks[CPU_STATE_USER]+ticks.cpu_ticks[CPU_STATE_SYSTEM]+ticks.cpu_ticks[CPU_STATE_NICE]+*idle;return 0;
#else
    FILE *f=fopen("/proc/stat","r");unsigned long long a,b,c,d,e,g,h,j;if(!f)return -1;
    if(fscanf(f,"cpu %llu %llu %llu %llu %llu %llu %llu %llu",&a,&b,&c,&d,&e,&g,&h,&j)!=8){fclose(f);return -1;}fclose(f);*total=a+b+c+d+e+g+h+j;*idle=d+e;return 0;
#endif
}
cJSON *bp_diagnostic(void){
    cJSON *r=cJSON_CreateObject(),*cpu=cJSON_CreateObject(),*memory=cJSON_CreateObject(),*disk=cJSON_CreateObject();
    char hostname[256]="Local computer",system[512]="",model[256]="";double uptime=0,mem_total=0,mem_used=0,disk_total=0,disk_free=0,cores=1;
    unsigned long long t1=0,t2=0,i1=0,i2=0;int sampled=cpu_sample(&t1,&i1)==0;pause_sample();sampled=sampled&&cpu_sample(&t2,&i2)==0;
#ifdef _WIN32
    DWORD size=sizeof(hostname);MEMORYSTATUSEX mem;SYSTEM_INFO info;ULARGE_INTEGER freebytes,totalbytes,available;
    GetComputerNameA(hostname,&size);GetNativeSystemInfo(&info);cores=info.dwNumberOfProcessors;snprintf(system,sizeof(system),"Windows (%s)",info.wProcessorArchitecture==PROCESSOR_ARCHITECTURE_ARM64?"ARM64":"x86-64");
    snprintf(model,sizeof(model),"%s",getenv("PROCESSOR_IDENTIFIER")?getenv("PROCESSOR_IDENTIFIER"):"CPU");uptime=GetTickCount64()/1000.0;
    memset(&mem,0,sizeof(mem));mem.dwLength=sizeof(mem);if(GlobalMemoryStatusEx(&mem)){mem_total=(double)mem.ullTotalPhys;mem_used=(double)(mem.ullTotalPhys-mem.ullAvailPhys);}
    if(GetDiskFreeSpaceExA(NULL,&available,&totalbytes,&freebytes)){disk_total=(double)totalbytes.QuadPart;disk_free=(double)freebytes.QuadPart;}
#else
    struct utsname u;struct statvfs fs;gethostname(hostname,sizeof(hostname)-1);if(!uname(&u))snprintf(system,sizeof(system),"%s %s (%s)",u.sysname,u.release,u.machine);
    cores=sysconf(_SC_NPROCESSORS_ONLN);if(!statvfs("/",&fs)){disk_total=(double)fs.f_blocks*fs.f_frsize;disk_free=(double)fs.f_bavail*fs.f_frsize;}
#ifdef __APPLE__
    {size_t n=sizeof(model);uint64_t ram=0;struct timeval boot;size_t m=sizeof(ram);sysctlbyname("machdep.cpu.brand_string",model,&n,NULL,0);sysctlbyname("hw.memsize",&ram,&m,NULL,0);mem_total=(double)ram;
    m=sizeof(boot);if(!sysctlbyname("kern.boottime",&boot,&m,NULL,0))uptime=difftime(time(NULL),boot.tv_sec);
    vm_statistics64_data_t vm;mach_msg_type_number_t count=HOST_VM_INFO64_COUNT;vm_size_t page;mach_port_t host=mach_host_self();
    host_page_size(host,&page);if(host_statistics64(host,HOST_VM_INFO64,(host_info64_t)&vm,&count)==KERN_SUCCESS)mem_used=mem_total-(double)(vm.free_count+vm.inactive_count)*page;mach_port_deallocate(mach_task_self(),host);}
#else
    {struct sysinfo info;FILE *f;char line[1024];unsigned long long available=0;
    if(!sysinfo(&info)){uptime=info.uptime;mem_total=(double)info.totalram*info.mem_unit;mem_used=mem_total-(double)info.freeram*info.mem_unit;}
    f=fopen("/proc/meminfo","r");if(f){while(fgets(line,sizeof(line),f))if(sscanf(line,"MemAvailable: %llu kB",&available)==1)break;fclose(f);if(available)mem_used=mem_total-(double)available*1024;}
    f=fopen("/proc/cpuinfo","r");if(f){while(fgets(line,sizeof(line),f)){if(!strncmp(line,"model name",10)||!strncmp(line,"Hardware",8)){char *p=strchr(line,':');if(p){p++;while(*p==' ')p++;strncpy(model,p,sizeof(model)-1);model[strcspn(model,"\r\n")]=0;}break;}}fclose(f);}}
#endif
    {double loads[3];if(getloadavg(loads,3)==3){cJSON *a=cJSON_CreateArray();int i;for(i=0;i<3;i++)cJSON_AddItemToArray(a,cJSON_CreateNumber(loads[i]));cJSON_AddItemToObject(cpu,"load_average",a);}}
#endif
    if(!*model)strcpy(model,"System CPU");
    cJSON_AddStringToObject(r,"hostname",hostname);cJSON_AddStringToObject(r,"ip","127.0.0.1");cJSON_AddStringToObject(r,"system",system);cJSON_AddNumberToObject(r,"uptime_seconds",uptime);
    cJSON_AddStringToObject(cpu,"model",model);cJSON_AddNumberToObject(cpu,"logical_cores",cores);
    if(sampled&&t2>t1)cJSON_AddNumberToObject(cpu,"usage_percent",100.0*(1.0-(double)(i2-i1)/(double)(t2-t1)));else cJSON_AddNullToObject(cpu,"usage_percent");
    if(!cJSON_HasObjectItem(cpu,"load_average"))cJSON_AddNullToObject(cpu,"load_average");
    cJSON_AddNumberToObject(memory,"total_bytes",mem_total);cJSON_AddNumberToObject(memory,"used_bytes",mem_used);
    cJSON_AddStringToObject(disk,"path","/");cJSON_AddNumberToObject(disk,"total_bytes",disk_total);cJSON_AddNumberToObject(disk,"free_bytes",disk_free);cJSON_AddNumberToObject(disk,"used_bytes",disk_total-disk_free);
    cJSON_AddItemToObject(r,"cpu",cpu);cJSON_AddItemToObject(r,"memory",memory);cJSON_AddItemToObject(r,"disk",disk);return r;
}
