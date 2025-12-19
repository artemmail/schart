// models/returned-user.model.ts
export interface ReturnedUser {
    username: string;
    Email: string;
    cnt: number;
    total: number;
    min: number;
    max: number;
    lastdate: string;
    expdate: string;
    totalPays: any;
  }
  
  // models/total-pay.model.ts
  export interface TotalPay {
    Id: number;
    UserName: string;
    Email: string;
    PayAmount: number;
    PayDate: string;
    ExpireDate: string;
    Service: number;
  }

  
  export interface ApplicationUserModel {
    Id: string;
    UserName: string;
    Email: string;
    RegistrationDate: Date;
    EmailConfirmed: boolean;
  }
