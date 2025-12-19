using System;
using System.Threading;

namespace StockChart.EventBus
{
    public abstract class Disposable : IDisposable
    {
        private int _isDisposed;

        protected bool IsDisposed
        {
            get { return Volatile.Read(ref _isDisposed) > 0; }
        }

        protected virtual void Cleanup()
        {
        }

        protected void ThrowIfDisposed()
        {
            if(IsDisposed)
                throw new ObjectDisposedException(GetType().AssemblyQualifiedName);
        }

        public void Dispose()
        {
            if (Interlocked.CompareExchange(ref _isDisposed, 1, 0) > 0)
                return;

            Cleanup();
        }
    }
}