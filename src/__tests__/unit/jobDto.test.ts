import { JobDTO } from '@scrapers/revolico/services/dto';
import { ValidationError } from '@scrapers/revolico/errors';

describe('DTO - Job', () => {
  it('should create a valid JobDTO with valid data', () => {
    const data = {
      category: 'electronics',
      subcategory: 'laptops',
      pageNumber: 1,
      totalPages: 5,
    };

    const JobDto = JobDTO.from(data);

    expect(JobDto).toBeInstanceOf(JobDTO);
    expect(JobDto.category).toBe(data.category);
    expect(JobDto.subcategory).toBe(data.subcategory);
    expect(JobDto.pageNumber).toBe(data.pageNumber);
    expect(JobDto.totalPages).toBe(data.totalPages);
  });

  it('should throw an error if category is missing', () => {
    const invalidData = {
      subcategory: 'laptops',
      pageNumber: 1,
      totalPages: 5,
    };

    expect(() => JobDTO.from(invalidData)).toThrow(ValidationError);    

    try {
      JobDTO.from(invalidData);
    } catch (error) {      
      if (error instanceof ValidationError) {
        expect(error.validationErrors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'invalid_type',
              message: 'Required',
              path: ['category'],
            }),
          ]),
        );
      }
    }
  });

  it('should throw an error if category is empty', () => {
    const data = { category: '' };
    expect(() => JobDTO.from(data)).toThrow(ValidationError);
  });

  it('should create a valid JobDTO with only required category', () => {
    const data = { category: 'electronics' };

    const JobDto = JobDTO.from(data);
    expect(JobDto).toBeInstanceOf(JobDTO);
    expect(JobDto.category).toBe(data.category);
    expect(JobDto.subcategory).toBeUndefined();
    expect(JobDto.pageNumber).toBeUndefined();
    expect(JobDto.totalPages).toBeUndefined();
  });
});
