export interface PaymentShow {
    id: number;
    userId: string;
    payAmount: number;
    payDate: Date;
    expireDate: Date;
    service: number;
    userName?: string;
    email?: string;
  }
  

  export interface ApplicationUser {
    id: string;
    userName: string;
    email: string;
  }

  export interface PaymentResponse1 {
    userInfo: PaymentShow;
    referal: ApplicationUser;
  }
  