import { apiClient } from '@shared/api/client';

/** Raw rule shape from the backend. */
export interface RuleDTO {
  id: string;
  ruleKey: string;
  values: string[];
  version: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Response envelope for GET /api/admin/rules */
export interface RuleListResponseDTO {
  rules: RuleDTO[];
}

/** Response envelope for GET /api/admin/rules/:ruleKey */
export interface RuleDetailResponseDTO {
  rule: RuleDTO;
}

/** Payload for POST /api/admin/rules */
export interface CreateRulePayload {
  ruleKey: string;
  values: string[];
}

/** Payload for PUT /api/admin/rules/:ruleKey */
export interface UpdateRulePayload {
  values: string[];
}

export const rulesService = {
  /** List all rules (enabled and disabled). */
  list(params?: { signal?: AbortSignal }) {
    return apiClient.get<RuleListResponseDTO>('/admin/rules', { params });
  },

  /** Get a single rule by its key. */
  getByKey(ruleKey: string, params?: { signal?: AbortSignal }) {
    return apiClient.get<RuleDetailResponseDTO>(`/admin/rules/${ruleKey}`, { params });
  },

  /** Create a new rule. Fails with 409 if the ruleKey already exists. */
  create(data: CreateRulePayload) {
    return apiClient.post<RuleDetailResponseDTO>('/admin/rules', data);
  },

  /** Update an existing rule's values (replaces the whole array). */
  update(ruleKey: string, data: UpdateRulePayload) {
    return apiClient.put<RuleDetailResponseDTO>(`/admin/rules/${ruleKey}`, data);
  },

  /**
   * Delete a rule by its key.
   * @remarks Backend endpoint not yet exposed — this will 404 until implemented.
   */
  delete(ruleKey: string) {
    return apiClient.delete(`/admin/rules/${ruleKey}`);
  },

  /** Toggle a rule's enabled flag. */
  toggle(ruleKey: string) {
    return apiClient.patch<RuleDetailResponseDTO>(`/admin/rules/${ruleKey}/toggle`);
  },
};
