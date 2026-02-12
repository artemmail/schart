export interface PaginatedResult<T> {
  Items: T[];
  TotalCount: number;
  Page: number;
  PageSize: number;
}

export interface UserTopic {
  Id: number;
  Date: string;
  Header: string;
  CommentCount: number;
  Author: string;
  Slug: string; // Новое поле Slug
}

export interface UserTopicText {
  Id: number;
  Date: Date;
  Header: string;
  CommentCount: number;
  Author: string;
  Text: string;
  Slug: string; // Новое поле Slug
}


export interface ApplicationUser {
  Id: string;
  UserName: string;
  HasActiveSubscription?: boolean;
  hasActiveSubscription?: boolean;
  IsAdmin?: boolean;
  isAdmin?: boolean;
}

export interface Comment {
  Id: number;
  Text: string;
  Date: Date;
  User: ApplicationUser;
  TopicId: number;
}

export interface Topic {
  Id: number;
  Header: string;
  Text: string;
  Date: Date;
  Hide?: boolean;
  Slug: string; // Новое поле Slug
  TopicUser: ApplicationUser;
  UserComments: Comment[];
}
