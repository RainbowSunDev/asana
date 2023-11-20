export type CodeExchangeData = {
    access_token: string;
    token_type: string;
    expires_in: number;
    data: { id: string; gid: string; name: string; email: string };
    refresh_token: string;
  };


  