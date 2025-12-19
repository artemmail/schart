namespace StockChart.EventBus.RabbitMQ
{
    // public class CommandBusRabbitMq : ICommandBus, IDisposable
    // {
    //     private readonly IRabbitMqPersistentConnection _persistentConnection;
    //     private readonly ILogger<CommandBusRabbitMq> _logger;
    //     private readonly ICommandBusSubscriptionsManager _subsManager;
    //     private readonly ILifetimeScope _autofac;
    //     private readonly string _autofacScopeName = "event_bus_container";
    //     private readonly string _brokerName;
    //     private readonly string _exchangeType;
    //
    //     private string _queueName;
    //     private string _replyQueueName;
    //     private IModel _consumerChannel;
    //     private IModel _replyChannel;
    //     private EventingBasicConsumer _replyConsumer;
    //     private RetryPolicy _policy;
    //
    //     public CommandBusRabbitMq(
    //         ILifetimeScope autofac,
    //         IRabbitMqPersistentConnection persistentConnection,
    //         ICommandBusSubscriptionsManager subsManager,
    //         ILogger<CommandBusRabbitMq> logger,
    //         string brokerName,
    //         string exchangeType,
    //         string queueName,
    //         int retryCount = 5)
    //     {
    //         _persistentConnection = persistentConnection ?? throw new ArgumentNullException(nameof(persistentConnection));
    //         _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    //         _autofac = autofac;
    //         _subsManager = subsManager ?? new InMemoryCommandBusSubscriptionsManager(isSingleHandlerPerEventOnly: true);
    //         _brokerName = brokerName ?? throw new ArgumentException(nameof(brokerName));
    //         _exchangeType = exchangeType ?? throw new ArgumentException(nameof(exchangeType));
    //         _queueName = queueName ?? throw new ArgumentException(nameof(queueName));
    //         _replyQueueName = $"{this._queueName}_reply";
    //
    //         _subsManager.OnEventRemoved += SubsManager_OnEventRemoved;
    //         _consumerChannel = CreateConsumerChannel();
    //         _replyChannel = CreateReplyChannel();
    //
    //         _policy = Policy
    //             .Handle<BrokerUnreachableException>()
    //             .Or<SocketException>()
    //             .WaitAndRetry(retryCount, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)), (ex, time) =>
    //             {
    //                 _logger.LogWarning(ex.ToString());
    //             });
    //     }
    //
    //     public Task<T> RequestAsync<T>(IntegrationEvent @event)
    //         where T : class, new()
    //     {
    //         var tsc = new TaskCompletionSource<T>();
    //         var task = tsc.Task;
    //
    //         var eventName = @event.GetType().Name;
    //         var replyEventName = $"{eventName}_reply";
    //         var correlationId = @event.Id.ToString();
    //         var bytes = GetBytes(@event);
    //
    //         if (!_persistentConnection.IsConnected)
    //         {
    //             _persistentConnection.TryConnect();
    //         }
    //
    //         var sendProps = _replyChannel.CreateBasicProperties();
    //         sendProps.DeliveryMode = 2;
    //         sendProps.CorrelationId = correlationId;
    //         sendProps.ReplyTo = replyEventName;
    //
    //         void Handler(object model, BasicDeliverEventArgs ea)
    //         {
    //             if (ea.BasicProperties.CorrelationId != correlationId)
    //             {
    //                 return;
    //             }
    //
    //             _replyConsumer.Received -= Handler;
    //
    //             //RemoveQueueBind(this._replyQueueName, replyEventName);
    //
    //             var responseBody = ea.Body.ToArray(); //TODO: несколько грубо.
    //             var response = Encoding.UTF8.GetString(responseBody);
    //             var integrationEvent = JsonConvert.DeserializeObject<T>(response);
    //             tsc.SetResult(integrationEvent);
    //         }
    //
    //         _replyConsumer.Received += Handler;
    //
    //         AddQueueBind(this._replyQueueName, replyEventName);
    //
    //         _policy.Execute(() =>
    //         {
    //             _replyChannel.BasicPublish(exchange: _brokerName, routingKey: eventName, mandatory: true, basicProperties: sendProps, body: bytes);
    //
    //             _logger.LogInformation($"Command publication {eventName}. Message: {JsonConvert.SerializeObject(@event)}.");
    //         });
    //
    //         return task;
    //     }
    //
    //     /// <summary>
    //     /// Подписаться на событие
    //     /// </summary>
    //     /// <param name="subscriber"></param>
    //     public void Subscribe(ISubscriber subscriber)
    //     {
    //         throw new NotImplementedException();
    //     }
    //
    //     /// <summary>
    //     /// Отписаться от события
    //     /// </summary>
    //     /// <param name="subscriber"></param>
    //     public void Unsubscribe(ISubscriber subscriber)
    //     {
    //         throw new NotImplementedException();
    //     }
    //
    //     public void Subscribe<T, TH>()
    //         where T : IntegrationEvent
    //         where TH : class, IIntegrationCommandHandler<T>
    //     {
    //         var eventName = _subsManager.GetEventKey<T>();
    //
    //         var containsKey = _subsManager.HasSubscriptionsForEvent(eventName);
    //         if (!containsKey)
    //         {
    //             AddQueueBind(this._queueName, eventName);
    //         }
    //
    //         _subsManager.AddSubscription<T, TH>();
    //     }
    //
    //     public void Unsubscribe<T, TH>()
    //         where T : IntegrationEvent
    //         where TH : class, IIntegrationCommandHandler<T>
    //     {
    //         _subsManager.RemoveSubscription<T, TH>();
    //     }
    //
    //     public void Dispose()
    //     {
    //         _consumerChannel?.Dispose();
    //         _replyChannel?.Dispose();
    //
    //         _subsManager.Clear();
    //     }
    //
    //     private IModel CreateConsumerChannel()
    //     {
    //         if (!_persistentConnection.IsConnected)
    //         {
    //             _persistentConnection.TryConnect();
    //         }
    //
    //         var channel = _persistentConnection.CreateModel();
    //
    //         channel.ExchangeDeclare(exchange: _brokerName, type: _exchangeType, durable: true);
    //         channel.QueueDeclare(queue: _queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
    //         channel.BasicQos(0, 1, false);
    //
    //         var consumer = new EventingBasicConsumer(channel);
    //
    //         consumer.Received += async (model, ea) =>
    //         {
    //             var eventName = ea.RoutingKey;
    //             var body = ea.Body.ToArray();
    //             var message = Encoding.UTF8.GetString(body);
    //             var requestProps = ea.BasicProperties;
    //             var replyProps = channel.CreateBasicProperties();
    //             replyProps.CorrelationId = requestProps.CorrelationId;
    //
    //             var val = await ProcessEvent(eventName, message);
    //             var bytes = GetBytes(val);
    //
    //             channel.BasicPublish(exchange: _brokerName, routingKey: requestProps.ReplyTo, basicProperties: replyProps, body: bytes);
    //             channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
    //         };
    //
    //         channel.BasicConsume(consumer: consumer, queue: _queueName, autoAck: false);
    //
    //         channel.CallbackException += (sender, ea) =>
    //         {
    //             _consumerChannel.Dispose();
    //             _consumerChannel = CreateConsumerChannel();
    //         };
    //
    //         return channel;
    //     }
    //
    //     private IModel CreateReplyChannel()
    //     {
    //         if (!_persistentConnection.IsConnected)
    //         {
    //             _persistentConnection.TryConnect();
    //         }
    //
    //         var channel = _persistentConnection.CreateModel();
    //
    //         channel.ExchangeDeclare(_brokerName, _exchangeType, true);
    //         channel.QueueDeclare(queue: _replyQueueName, durable: false, exclusive: false, autoDelete: false, arguments: null);
    //
    //         _replyConsumer = new EventingBasicConsumer(channel);
    //
    //         channel.BasicConsume(consumer: _replyConsumer, queue: _replyQueueName, autoAck: true);
    //
    //         channel.CallbackException += (sender, ea) =>
    //         {
    //             _replyChannel.Dispose();
    //             _replyChannel = CreateReplyChannel();
    //         };
    //
    //         return channel;
    //     }
    //
    //     private async Task<object> ProcessEvent(string eventName, string message)
    //     {
    //         if (_subsManager.HasSubscriptionsForEvent(eventName))
    //         {
    //             using (var scope = _autofac.BeginLifetimeScope(_autofacScopeName))
    //             {
    //                 var subscriptions = _subsManager.GetHandlersForEvent(eventName);
    //                 foreach (var subscription in subscriptions)
    //                 {
    //                     _logger.LogInformation($"Command {eventName} is about to be handled by: {subscription.HandlerType.Name}.");
    //
    //                     var eventType = _subsManager.GetEventTypeByName(eventName);
    //                     var integrationEvent = JsonConvert.DeserializeObject(message, eventType);
    //                     var handler = scope.ResolveOptional(subscription.HandlerType);
    //
    //                     var concreteType = typeof(IIntegrationCommandHandler<>).MakeGenericType(eventType);
    //                     return await (Task<object>)concreteType.GetMethod("Handle").Invoke(handler, new[] { integrationEvent });
    //                 }
    //             }
    //         }
    //         return Task.FromResult(new object());
    //     }
    //
    //     private void SubsManager_OnEventRemoved(object sender, string eventName)
    //     {
    //         this.RemoveQueueBind(this._queueName, eventName);
    //     }
    //
    //     private void AddQueueBind(string queueName, string eventName)
    //     {
    //         if (!_persistentConnection.IsConnected)
    //         {
    //             _persistentConnection.TryConnect();
    //         }
    //
    //         using (var channel = _persistentConnection.CreateModel())
    //         {
    //             channel.QueueBind(queue: queueName, exchange: this._brokerName, routingKey: eventName);
    //         }
    //     }
    //
    //     private void RemoveQueueBind(string queueName, string eventName)
    //     {
    //         if (!_persistentConnection.IsConnected)
    //         {
    //             _persistentConnection.TryConnect();
    //         }
    //
    //         using (var channel = _persistentConnection.CreateModel())
    //         {
    //             channel.QueueUnbind(queueName, _brokerName, eventName);
    //
    //             if (_subsManager.IsEmpty)
    //             {
    //                 //_queueName = string.Empty;
    //                 _consumerChannel.Close();
    //             }
    //         }
    //     }
    //
    //     private byte[] GetBytes(object value)
    //     {
    //         var message = JsonConvert.SerializeObject(value);
    //         var body = Encoding.UTF8.GetBytes(message);
    //         return body;
    //     }
    // }
}
