export interface AccountDTO {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  ownerEmail: string;
  userCount: number;
  planName: string;
}

export interface AccountListResponseDTO {
  items: AccountDTO[];
  total: number;
}
