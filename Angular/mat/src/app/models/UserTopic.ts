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
  LikeCount: number;
  IsLikedByCurrentUser: boolean;
  Author: string;
  Slug: string;
}

export interface UserTopicText {
  Id: number;
  Date: Date;
  Header: string;
  CommentCount: number;
  LikeCount: number;
  IsLikedByCurrentUser: boolean;
  Author: string;
  Text: string;
  Slug: string;
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
  Slug: string;
  LikeCount: number;
  IsLikedByCurrentUser: boolean;
  TopicUser: ApplicationUser;
  UserComments: Comment[];
}
