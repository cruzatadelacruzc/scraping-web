import { UpdateScheduleDTO } from '@cron/services/dto/update-schedule.dto';
import { ValidationError } from '@shared/errors/validation.error';

describe('UpdateScheduleDTO', () => {
  describe('from', () => {
    it('should create a DTO when all optional fields are provided', () => {
      const body = {
        name: 'Updated Schedule',
        store: 'revolico',
        cron: '30 9 * * *',
        enabled: false,
        jobs: [{ category: 'electronics' }],
      };

      const dto = UpdateScheduleDTO.from(body);

      expect(dto).toBeInstanceOf(UpdateScheduleDTO);
      expect(dto.name).toBe('Updated Schedule');
      expect(dto.store).toBe('revolico');
      expect(dto.cron).toBe('30 9 * * *');
      expect(dto.enabled).toBe(false);
      expect(dto.jobs).toHaveLength(1);
      expect(dto.jobs![0]).toEqual({ category: 'electronics' });
    });

    it('should return a DTO with all undefined when body is empty', () => {
      const dto = UpdateScheduleDTO.from({});

      expect(dto).toBeInstanceOf(UpdateScheduleDTO);
      expect(dto.name).toBeUndefined();
      expect(dto.store).toBeUndefined();
      expect(dto.cron).toBeUndefined();
      expect(dto.enabled).toBeUndefined();
      expect(dto.jobs).toBeUndefined();
    });

    it('should return a DTO with only enabled set when only enabled is provided', () => {
      const dto = UpdateScheduleDTO.from({ enabled: false });

      expect(dto.enabled).toBe(false);
      expect(dto.name).toBeUndefined();
      expect(dto.store).toBeUndefined();
      expect(dto.cron).toBeUndefined();
      expect(dto.jobs).toBeUndefined();
    });

    it('should create a DTO with a single-element jobs array', () => {
      const body = {
        jobs: [{ category: 'vehicles' }],
      };

      const dto = UpdateScheduleDTO.from(body);

      expect(dto.jobs).toHaveLength(1);
      expect(dto.jobs![0]).toEqual({ category: 'vehicles' });
    });

    it('should throw ValidationError when jobs array is empty', () => {
      const body = { jobs: [] };

      let error: unknown;
      try {
        UpdateScheduleDTO.from(body);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.validationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'At least one scraping job is required',
            path: ['jobs'],
          }),
        ]),
      );
    });
  });
});
