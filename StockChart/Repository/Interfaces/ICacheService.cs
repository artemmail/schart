namespace StockChart.Repository
{
    public interface ICacheService
    {
        bool TryGet<T>(string cacheKey, out T value);
        T Set<T>(string cacheKey, T value);
        void Remove(string cacheKey);

        Task<T> GetOrAddAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiration);

    }
}
