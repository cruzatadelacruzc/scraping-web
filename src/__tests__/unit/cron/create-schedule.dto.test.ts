import { CreateScheduleDTO } from '@cron/services/dto/create-schedule.dto';
import { ValidationError } from '@shared/errors/validation.error';

describe('CreateScheduleDTO', () => {
  describe('from', () => {
    it('should create a DTO with valid body containing all fields', () => {
      const body = {
        name: 'Daily Revolico Check',
        store: 'revolico',
        cron: '0 8 * * *',
        enabled: true,
        jobs: [{ category: 'electronics' }, { category: 'vehicles' }],
      };

      const dto = CreateScheduleDTO.from(body);

      expect(dto).toBeInstanceOf(CreateScheduleDTO);
      expect(dto.name).toBe('Daily Revolico Check');
      expect(dto.store).toBe('revolico');
      expect(dto.cron).toBe('0 8 * * *');
      expect(dto.enabled).toBe(true);
      expect(dto.jobs).toHaveLength(2);
      expect(dto.jobs[0]).toEqual({ category: 'electronics' });
      expect(dto.jobs[1]).toEqual({ category: 'vehicles' });
    });

    it('should default enabled to true when omitted', () => {
      const body = {
        name: 'Weekend Scan',
        store: 'revolico',
        cron: '0 10 * * 6',
        jobs: [{ category: 'all' }],
      };

      const dto = CreateScheduleDTO.from(body);

      expect(dto.enabled).toBe(true);
    });

    it('should throw ValidationError when name is missing', () => {
      const body = {
        store: 'revolico',
        cron: '0 * * * *',
        jobs: [{ category: 'test' }],
      };

      expect(() => CreateScheduleDTO.from(body)).toThrow(ValidationError);
    });

    it('should throw ValidationError when store is missing', () => {
      const body = {
        name: 'Test',
        cron: '0 * * * *',
        jobs: [{ category: 'test' }],
      };

      let error: unknown;
      try {
        CreateScheduleDTO.from(body);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.validationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            message: 'Required',
            path: ['store'],
          }),
        ]),
      );
    });

    it('should throw ValidationError when cron is empty string', () => {
      const body = {
        name: 'Test',
        store: 'revolico',
        cron: '',
        jobs: [{ category: 'test' }],
      };

      let error: unknown;
      try {
        CreateScheduleDTO.from(body);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.validationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Cron expression is required',
            path: ['cron'],
          }),
        ]),
      );
    });

    it('should throw ValidationError when jobs array is empty', () => {
      const body = {
        name: 'Test',
        store: 'revolico',
        cron: '0 * * * *',
        jobs: [],
      };

      expect(() => CreateScheduleDTO.from(body)).toThrow(ValidationError);
    });

    it('should accept jobs with extra fields beyond category', () => {
      const body = {
        name: 'Deep Scan',
        store: 'revolico',
        cron: '30 */4 * * *',
        jobs: [{ category: 'electronics', subcategory: 'laptops', pageNumber: 3 }],
      };

      const dto = CreateScheduleDTO.from(body);

      expect(dto.jobs).toHaveLength(1);
      expect(dto.jobs[0]).toEqual({
        category: 'electronics',
        subcategory: 'laptops',
        pageNumber: 3,
      });
    });

    it('should throw ValidationError when jobs is a string instead of an array', () => {
      const body = {
        name: 'Test',
        store: 'revolico',
        cron: '0 * * * *',
        jobs: 'not-an-array',
      };

      let error: unknown;
      try {
        CreateScheduleDTO.from(body);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.validationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            path: ['jobs'],
          }),
        ]),
      );
    });
  });
});
