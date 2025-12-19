// Decompiled with JetBrains decompiler
// Type: DDEInfo.ConnectEventArgs
// Assembly: DDEInfo, Version=1.0.3568.24078, Culture=neutral, PublicKeyToken=null
// MVID: 5CBC33B0-916C-449C-8C2C-F13FA720A9EC
// Assembly location: D:\DdeExportSample\DdeExportSample\Программа\ConsoleApplication1\bin\Debug\DDEInfo.dll
using NDde.Server;
using System;
namespace DDEInfo
{
  public class ConnectEventArgs
  {
    private DdeConversation m_conversation = (DdeConversation) null;
    public DdeConversation Conversation
    {
      get
      {
        return this.m_conversation;
      }
    }
    public string Service
    {
      get
      {
        return this.m_conversation != null ? string.Empty : this.m_conversation.Service;
      }
    }
    public string Topic
    {
      get
      {
        return this.m_conversation != null ? string.Empty : this.m_conversation.Topic;
      }
    }
    public IntPtr Handle
    {
      get
      {
        return this.m_conversation != null ? IntPtr.Zero : this.m_conversation.Handle;
      }
    }
    public string HandleAsString
    {
      get
      {
        return this.m_conversation != null ? string.Empty : this.m_conversation.Handle.ToString();
      }
    }
    public ConnectEventArgs(DdeConversation theDdeConversation)
    {
      this.m_conversation = theDdeConversation;
    }
  }
}
