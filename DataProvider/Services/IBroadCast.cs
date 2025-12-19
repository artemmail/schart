using System.Collections.Generic;
using System.Threading.Tasks;

public interface IBroadCast
{
    public Task BroadCastCandles(HashSet<string> list);
    public Task BroadCastClusters(HashSet<string> list);

}