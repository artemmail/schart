// Decompiled with JetBrains decompiler
// Type: DDEInfo.InfoServer
// Assembly: DDEInfo, Version=1.0.3568.24078, Culture=neutral, PublicKeyToken=null
// MVID: 5CBC33B0-916C-449C-8C2C-F13FA720A9EC
// Assembly location: D:\DdeExportSample\DdeExportSample\Программа\ConsoleApplication1\bin\Debug\DDEInfo.dll
using FTFHelper;
using NDde.Server;
using System.Collections.Generic;
using System.Timers;
namespace DDEInfo
{
    public class InfoServer: DdeServer
    {
        private eServerState m_state = eServerState.Unknown;
        private Timer m_timer = new Timer();
        private double m_adviseInterval = 0.0;
        private string m_service = string.Empty;
        private List<string> m_topics = null;
        public eServerState State
        {
            get
            {
                return this.m_state;
            }
        }
        public double AdviseInterval
        {
            get
            {
                return this.m_adviseInterval;
            }
            set
            {
                if (this.IsRegistered)
                    return;
                this.m_adviseInterval=value;
                if (this.m_adviseInterval>0.0)
                    return;
                this.m_timer.Interval=1000.0;
            }
        }
        public string[] Topics
        {
            get
            {
                return this.m_topics.ToArray();
            }
        }
        public event DataPokedEventHandler DataPoked;
        public event ConnectedEventHandler Connected;
        public event DisconnectedEventHandler Disconnected;
        public event StateChangedEventHandler StateChanged;
        public InfoServer(string theService)
          : base(theService)
        {
            this.m_adviseInterval=1000.0;
            this.m_timer.Elapsed+=new ElapsedEventHandler(this.OnTimerElapsed);
            this.m_timer.Interval=this.m_adviseInterval;
            this.m_timer.SynchronizingObject=Context;
            this.m_topics=new List<string>();
            this.SetState(eServerState.Unregistered);
        }
        private void SetState(eServerState theServerState)
        {
            eServerState theOldState = this.m_state;
            this.m_state=theServerState;
            this.OnStateChanged(new StateChangedEventArgs(theOldState, this.m_state, this.m_topics.Count));
        }
        private void OnTimerElapsed(object sender, ElapsedEventArgs args)
        {
            this.Advise("*", "*");
        }
        private void OnStateChanged(StateChangedEventArgs e)
        {
            if (this.StateChanged==null)
                return;
            this.StateChanged(this, e);
        }
        protected override bool OnBeforeConnect(string theTopic)
        {
            bool flag = false;
            if (string.IsNullOrEmpty(theTopic))
                return flag;
            return !this.m_topics.Contains(theTopic);
        }
        protected override void OnAfterConnect(DdeConversation theConversation)
        {
            if (!this.m_topics.Contains(theConversation.Topic))
                this.m_topics.Add(theConversation.Topic);
            this.SetState(eServerState.Connected);
            if (this.Connected==null)
                return;
            this.Connected(this, new ConnectEventArgs(theConversation));
        }
        protected override void OnDisconnect(DdeConversation theConversation)
        {
            if (this.m_topics.Contains(theConversation.Topic))
                this.m_topics.Remove(theConversation.Topic);
            if (this.m_topics.Count>0)
                this.SetState(eServerState.Connected);
            else
                this.SetState(eServerState.Disconnected);
            if (this.Disconnected==null)
                return;
            this.Disconnected(this, new ConnectEventArgs(theConversation));
        }
        protected override DdeServer.PokeResult OnPoke(DdeConversation theConversation, string theItem, byte[] theData, int theFormat)
        {
            if (this.DataPoked!=null)
            {
                object[][] theCells = XLTable.Cells(theData);
                this.DataPoked(this, new DataPokedEventArgs(theConversation, theItem, theCells));
            }
            return DdeServer.PokeResult.Processed;
        }
        public override void Register()
        {
            base.Register();
            this.SetState(eServerState.Registered);
            this.m_timer.Start();
        }
        public override void Unregister()
        {
            this.m_timer.Stop();
            base.Unregister();
            this.SetState(eServerState.Unregistered);
        }
    }
}
