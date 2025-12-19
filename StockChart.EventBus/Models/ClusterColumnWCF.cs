using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using System.Linq;

namespace StockChart.EventBus.Models
{

    public class ClusterColumnWCF : ClusterColumnBase
    {
        public List<cluster> cl { get; set; } = new List<cluster>();
    };

    public class ClusterColumnDic : ClusterColumnBase
    {        
       public Dictionary<decimal, cluster> ColumnDictionary = new Dictionary<decimal, cluster>();

       public ClusterColumnWCF Convert()
       {
            return new ClusterColumnWCF()
            {
                x = x,
                o = o,
                c = c,
                l = l,
                h = h,
                q = q,
                bq = bq,
                v = v,
                bv = bv,
                oi = oi,
                cl = ColumnDictionary.Values.ToList()
            };           
       }
    };
}
