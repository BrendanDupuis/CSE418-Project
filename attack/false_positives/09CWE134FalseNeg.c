#include <stdio.h>
int (*printer)(const char *, ...) = printf;
int main(int argc, char **argv){
    if(argc>1) printer(argv[1]); // user-controlled format through function pointer
    return 0;
}