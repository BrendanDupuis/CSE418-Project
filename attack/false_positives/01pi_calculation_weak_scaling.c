// Weak scaling is defined as how the solution time varies
// with the number of processors for a fixed problem size per processor.

#include <mpi.h>

#include <iostream>

// static constexpr long double N_BINS = 1000000000;
// static constexpr long N_BINS_PER_PROCESSOR = 300000000;

static constexpr long N_BINS_PER_PROCESSOR = 1000000000;

int main(int argc, char** argv) {
  MPI_Init(&argc, &argv);
  int world_size;
  MPI_Comm_size(MPI_COMM_WORLD, &world_size);

  int world_rank;
  MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);

  const long N_BINS = N_BINS_PER_PROCESSOR * world_size;
  // The whole range is <0, 1>. This range's lenght is 1
  const long double BIN_SIZE = (long double)1 / (long double)N_BINS;
  const long double HALF_BIN_SIZE = BIN_SIZE / 2;

  long base_elements_per_process = N_BINS / world_size;
  long remainder = N_BINS % world_size;

  // The reminder must be less than world_size. Each process up to "remainder"
  // gets one extra element;
  long local_reminder = world_rank < remainder ? 1 : 0;
  long local_elements = base_elements_per_process + local_reminder;

  long local_start = world_rank * base_elements_per_process + (world_rank < remainder ? world_rank : remainder);
  long local_end = local_start + local_elements;

  long double local_area = 0;

  for (long bin_n = local_start; bin_n < local_end; bin_n++) {
    long double bin_start = bin_n * BIN_SIZE;
    long double bin_middle = bin_start + HALF_BIN_SIZE;

    // evaluate f(bin_middle)
    long double f_bin_middle = 4 / (1 + (bin_middle * bin_middle));

    long double bin_area = f_bin_middle * BIN_SIZE;
    local_area += bin_area;
  }

  // Reduce to global_area
  long double global_area = 0;
  MPI_Reduce(&local_area, &global_area, 1, MPI_LONG_DOUBLE, MPI_SUM, 0, MPI_COMM_WORLD);
  if (world_rank == 0) {
    std::cout.precision(40);
    std::cout << "Estimated pi: " << global_area << std::endl;
  }

  MPI_Finalize();

  return 0;
}