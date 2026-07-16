import type { StoreDTO } from '../services/stores-service';
import type { StoreViewModel } from '../view-models/store-view-model';

/**
 * Transforms a StoreDTO from the API into a StoreViewModel for the UI.
 * Pure function — no side effects, no API calls, no logger.
 */
export function mapStoreDTOToViewModel(dto: StoreDTO): StoreViewModel {
  return {
    key: dto.key,
    displayName: dto.displayName,
    scrapingQueue: dto.scrapingQueue,
    jobSchema: {
      fields: dto.jobSchema.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        label: field.label,
        placeholder: field.placeholder,
      })),
    },
  };
}
