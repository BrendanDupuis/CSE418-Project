#include <iostream>

static constexpr long N_BINS = 300000000;
// The whole range is <0, 1>. This range's lenght is 1
static constexpr long double BIN_SIZE = (long double)1 / (long double)N_BINS;
static constexpr long double HALF_BIN_SIZE = BIN_SIZE / 2;

int main(int argc, char** argv) {
  long double area = 0;

  for (long double bin_start = 0.0; bin_start <= 1; bin_start += BIN_SIZE) {
    long double bin_middle = bin_start + HALF_BIN_SIZE;

    // evaluate f(bin_middle)
    long double f_bin_middle = 4 / (1 + (bin_middle * bin_middle));

    long double bin_area = f_bin_middle * BIN_SIZE;
    area += bin_area;
  }

  std::cout.precision(40);
  std::cout << "Estimated pi: " << area << std::endl;

  return 0;
}