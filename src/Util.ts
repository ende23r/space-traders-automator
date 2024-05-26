export function partition<T>(arr: T[], filter: (t: T) => boolean): [T[], T[]] {
  const inPartition: T[] = [];
  const outOfPartition: T[] = [];
  for (const el of arr) {
    if (filter(el)) {
      inPartition.push(el);
    } else {
      outOfPartition.push(el);
    }
  }

  return [inPartition, outOfPartition];
}
