// Decompiled with JetBrains decompiler
// Type: DDEInfo.StateChangedEventArgs
// Assembly: DDEInfo, Version=1.0.3568.24078, Culture=neutral, PublicKeyToken=null
// MVID: 5CBC33B0-916C-449C-8C2C-F13FA720A9EC
// Assembly location: D:\DdeExportSample\DdeExportSample\Программа\ConsoleApplication1\bin\Debug\DDEInfo.dll
namespace DDEInfo
{
    public class StateChangedEventArgs
    {
        private eServerState m_oldState = eServerState.Unknown;
        private eServerState m_newState = eServerState.Unknown;
        private int m_topicCount = 0;
        public eServerState OldState
        {
            get
            {
                return this.m_oldState;
            }
        }
        public eServerState NewState
        {
            get
            {
                return this.m_newState;
            }
        }
        public int TopicCount
        {
            get
            {
                return this.m_topicCount;
            }
        }
        public StateChangedEventArgs(eServerState theOldState, eServerState theNewState, int theTopicCount)
        {
            this.m_oldState=theOldState;
            this.m_newState=theNewState;
            this.m_topicCount=theTopicCount;
        }
    }
}
