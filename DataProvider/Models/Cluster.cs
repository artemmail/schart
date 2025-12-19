using System;

namespace DataProvider.Models
{
    class Cluster
    {
        public decimal q, bq, mx;
        public int ct;
        public Cluster(decimal quantity, byte direction)
        {
            ct = 1;
            q = quantity;
            bq = (direction > 0) ? quantity : 0;
            mx = (direction > 0) ? quantity : -quantity;
        }
        public void Add(decimal quantity, byte direction)
        {
            ct++;
            q += quantity;
            bq += (direction > 0) ? quantity : 0;
            if (quantity > Math.Abs(mx))
                mx = (direction > 0) ? quantity : -quantity;
        }
    }
}
