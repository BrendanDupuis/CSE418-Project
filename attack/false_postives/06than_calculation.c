// test_path_operations.c
#include <math.h>
#include <stdio.h>

int main() {
    // No file operations; pure computation
    double x = 3.14159;
    double result = sin(x) / cos(x);
    
    printf("tan(pi) ≈ %f\n", result);
    return 0;
}