using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
namespace StockChart.Repository
{
    public enum CacheTech
    {
        Redis,
        Memory
    }
    public class RedisCacheService : ICacheService
    {
        public void Remove(string cacheKey)
        {
            throw new NotImplementedException();
        }
        public T Set<T>(string cacheKey, T value)
        {
            throw new NotImplementedException();
        }
        public bool TryGet<T>(string cacheKey, out T value)
        {
            throw new NotImplementedException();
        }

        public async Task<T> GetOrAddAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiration)
        {
            throw new NotImplementedException();
        }
    }
    public class MemoryCacheService : ICacheService
    {
        private readonly IMemoryCache _memoryCache;
        private readonly CacheConfiguration _cacheConfig;
        private MemoryCacheEntryOptions _cacheOptions;
        public MemoryCacheService(IMemoryCache memoryCache, IOptions<CacheConfiguration> cacheConfig)
        {
            _memoryCache = memoryCache;
            _cacheConfig = cacheConfig.Value;
            if (_cacheConfig != null)
            {
                _cacheOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpiration = DateTime.Now.AddMinutes(_cacheConfig.AbsoluteExpirationInHours),
                    Priority = CacheItemPriority.High,
                    SlidingExpiration = TimeSpan.FromMinutes(_cacheConfig.SlidingExpirationInMinutes)
                };
            }
        }

        public async Task<T> GetOrAddAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiration)
        {
            if (_memoryCache.TryGetValue(key, out T value))
            {
                return value;
            }

            value = await factory();
            _memoryCache.Set(key, value, expiration);
            return value;
        }

        public bool TryGet<T>(string cacheKey, out T value)
        {
            _memoryCache.TryGetValue(cacheKey, out value);
            if (value == null) return false;
            else return true;
        }
        public T Set<T>(string cacheKey, T value)
        {
            return _memoryCache.Set(cacheKey, value, _cacheOptions);
        }
        public void Remove(string cacheKey)
        {
            _memoryCache.Remove(cacheKey);
        }
    }
}
