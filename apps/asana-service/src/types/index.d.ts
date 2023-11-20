export type CodeExchangeData = {
    access_token: string;
    token_type: string;
    expires_in: number;
    data: { id: string; gid: string; name: string; email: string };
    refresh_token: string;
  };

  export type Job = {
    organisation_id: string;
    pagination_token?: string;
    sync_started_at: string;
    priority: number;
  };
  
  export type User = {
    gid: string,
    email: string,
    name: string,
    resource_type: string,
    role: string,
    workspaces: [
      {
        gid: string,
        name: string,
        resource_type: string
      }
    ]
  };
  
  export type AsanaUsersData = {
    users: User[], 
    next_page?: {
      offset: string;
      path: string;
      uri: string;
    };
  };
  export type RefreshTokenResponse = {
    access_token: string;
    expires_in: number;
  };

  export type ElbaSendData = {
    id: string;
    email: string;
    displayName: string;
    additionalEmails: string[];
  };