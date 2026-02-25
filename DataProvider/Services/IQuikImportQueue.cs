using DataProvider.Models;
using System.Threading;
using System.Threading.Tasks;

namespace DataProvider.Services;

public interface IQuikImportQueue
{
    ValueTask EnqueueAsync(QuikImportBatch batch, CancellationToken cancellationToken);

    int QueueDepth { get; }
}
