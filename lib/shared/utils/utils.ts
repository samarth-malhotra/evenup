export const formatRs = (n: number) =>
  `₹${Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
