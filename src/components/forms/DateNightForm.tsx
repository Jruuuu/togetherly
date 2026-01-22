import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { DateNight } from '../../types/dateNight';
import { dateNightSchema } from '../../utils/validation';

// Update ages to support new structure
const formSchema = dateNightSchema.extend({
  ages: z.array(z.object({
    value: z.number().min(1),
    unit: z.enum(['months', 'years']),
  })).min(1, 'At least one age is required'),
}).refine((data) => {
  // Validate age values based on unit
  return data.ages.every((age) => {
    if (age.unit === 'months') {
      return age.value >= 1 && age.value <= 24;
    }
    return age.value >= 1 && age.value <= 18;
  });
}, {
  message: 'Age values must be within valid range (1-24 months or 1-18 years)',
  path: ['ages'],
}).refine((data) => {
  // Prevent past dates
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDate = new Date(data.date);
  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  
  return selectedDateOnly >= today;
}, {
  message: 'Date cannot be in the past',
  path: ['date'],
}).refine((data) => {
  // If date is today, ensure start time is in the future
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDate = new Date(data.date);
  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  
  if (selectedDateOnly.getTime() === today.getTime()) {
    // Date is today, check if time is in the past
    const [hours, minutes] = data.startTime.split(':').map(Number);
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    return selectedDateTime > now;
  }
  return true;
}, {
  message: 'Start time cannot be in the past for today',
  path: ['startTime'],
}).refine((data) => {
  // Ensure end time is after start time
  const [startHours, startMinutes] = data.startTime.split(':').map(Number);
  const [endHours, endMinutes] = data.endTime.split(':').map(Number);
  
  const startTimeMinutes = startHours * 60 + startMinutes;
  const endTimeMinutes = endHours * 60 + endMinutes;
  
  return endTimeMinutes > startTimeMinutes;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

type FormData = z.infer<typeof formSchema>;

interface DateNightFormProps {
  onSubmit: (data: Omit<DateNight, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
  initialData?: Partial<DateNight>;
  isLoading?: boolean;
}

export const DateNightForm: React.FC<DateNightFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      startTime: initialData?.startTime || '',
      endTime: initialData?.endTime || '',
      numberOfChildren: initialData?.numberOfChildren || 1,
      ages: initialData?.ages && initialData.ages.length > 0 
        ? initialData.ages.map((age) => ({
            value: Math.max(1, age.value || 1),
            unit: age.unit || 'years',
          }))
        : [{ value: 1, unit: 'years' }],
      location: initialData?.location || '',
      notes: initialData?.notes || '',
      schedule: initialData?.schedule || '',
      minNoticeHours: initialData?.minNoticeHours || 24,
    },
  });

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      const normalizedAges = initialData.ages && initialData.ages.length > 0
        ? initialData.ages.map((age) => ({
            value: Math.max(1, age.value || 1),
            unit: (age.unit === 'months' || age.unit === 'years') ? age.unit : 'years' as const,
          }))
        : [{ value: 1, unit: 'years' as const }];

      // Format date for input (YYYY-MM-DD)
      const dateValue = initialData.date 
        ? (initialData.date instanceof Date 
            ? initialData.date 
            : new Date(initialData.date))
        : new Date();
      
      // Ensure date is valid
      const validDate = dateValue instanceof Date && !isNaN(dateValue.getTime()) 
        ? dateValue 
        : new Date();

      reset({
        date: validDate,
        startTime: initialData.startTime || '',
        endTime: initialData.endTime || '',
        numberOfChildren: initialData.numberOfChildren || 1,
        ages: normalizedAges,
        location: initialData.location || '',
        notes: initialData.notes || '',
        schedule: initialData.schedule || '',
        minNoticeHours: initialData.minNoticeHours || 24,
      });
    }
  }, [initialData, reset]);

  const numberOfChildren = watch('numberOfChildren') || 1;
  const currentAges = watch('ages') || [];

  // Update ages array when numberOfChildren changes
  useEffect(() => {
    const currentLength = currentAges.length;
    if (numberOfChildren > currentLength) {
      // Add new age fields with default structure
      const newAges = [...currentAges, ...Array(numberOfChildren - currentLength).fill(null).map(() => ({ value: 1, unit: 'years' as const }))];
      setValue('ages', newAges, { shouldValidate: false });
    } else if (numberOfChildren < currentLength) {
      // Remove extra age fields
      const newAges = currentAges.slice(0, numberOfChildren);
      setValue('ages', newAges, { shouldValidate: false });
    }
  }, [numberOfChildren, currentAges, setValue]);

  // Ensure ages are always valid (fix NaN issue)
  useEffect(() => {
    const ages = watch('ages');
    if (Array.isArray(ages)) {
      const validAges = ages.map((age) => {
        const num = typeof age.value === 'number' ? age.value : Number(age.value) || 1;
        return { 
          value: isNaN(num) ? 1 : Math.max(1, num), 
          unit: (age.unit === 'months' || age.unit === 'years') ? age.unit : 'years' 
        };
      });
      // Only update if there are invalid values
      if (validAges.some((age, idx) => {
        const current = ages[idx];
        return !current || current.value !== age.value || current.unit !== age.unit;
      })) {
        setValue('ages', validAges, { shouldValidate: false });
      }
    }
  }, [watch, setValue]);


  const onFormSubmit = (data: FormData) => {
    console.log('📝 Form submission - Raw data.ages:', {
      ages: data.ages,
      isArray: Array.isArray(data.ages),
      length: data.ages?.length,
      type: typeof data.ages,
    });
    
    // Process ages - ensure values are within valid ranges
    const validAges = data.ages.map((age) => {
      const value = typeof age.value === 'number' ? age.value : Number(age.value) || 1;
      const unit = age.unit || 'years';
      // Clamp values based on unit
      const clampedValue = unit === 'months' 
        ? Math.max(1, Math.min(24, value))
        : Math.max(1, Math.min(18, value));
      return { value: clampedValue, unit };
    });

    console.log('✅ Processed validAges array:', {
      validAges,
      isArray: Array.isArray(validAges),
      length: validAges.length,
    });

    // Ensure we have the right number of ages
    if (validAges.length !== data.numberOfChildren) {
      // Fill missing ages with default
      while (validAges.length < data.numberOfChildren) {
        validAges.push({ value: 1, unit: 'years' as const });
      }
    }

    const dateNight: Omit<DateNight, 'id' | 'createdAt' | 'updatedAt'> = {
      coupleId: '', // Will be set by parent
      date: data.date instanceof Date ? data.date : new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      numberOfChildren: data.numberOfChildren,
      ages: validAges,
      location: data.location,
      notes: data.notes,
      schedule: data.schedule,
      volunteers: [],
      status: 'open',
      minNoticeHours: data.minNoticeHours,
    };
    
    console.log('✅ Final dateNight object being submitted:', {
      numberOfChildren: dateNight.numberOfChildren,
      ages: dateNight.ages,
      agesIsArray: Array.isArray(dateNight.ages),
      agesLength: dateNight.ages.length,
      agesType: typeof dateNight.ages,
      fullAges: JSON.stringify(dateNight.ages),
    });
    
    onSubmit(dateNight);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <Controller
          name="date"
          control={control}
          rules={{ required: 'Date is required' }}
          render={({ field }) => {
            // Format date for input (YYYY-MM-DD)
            const dateValue = field.value instanceof Date 
              ? field.value.toISOString().split('T')[0]
              : field.value 
                ? new Date(field.value).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            
            return (
              <Input
                label="Date"
                type="date"
                value={dateValue}
                min={today}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : new Date();
                  field.onChange(date);
                }}
                error={errors.date?.message}
              />
            );
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Controller
            name="startTime"
            control={control}
            rules={{ required: 'Start time is required' }}
            render={({ field }) => {
              // If date is today, set min time to current time
              const selectedDate = watch('date');
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const selectedDateOnly = selectedDate instanceof Date 
                ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
                : new Date(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth(), new Date(selectedDate).getDate());
              
              const isToday = selectedDateOnly.getTime() === today.getTime();
              const minTime = isToday 
                ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                : undefined;
              
              return (
                <Input
                  label="Start Time"
                  type="time"
                  value={field.value || ''}
                  min={minTime}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={errors.startTime?.message}
                />
              );
            }}
          />
        </div>
        <div>
          <Controller
            name="endTime"
            control={control}
            rules={{ required: 'End time is required' }}
            render={({ field }) => {
              // If date is today, set min time to start time (or current time if start time hasn't been set)
              const selectedDate = watch('date');
              const startTime = watch('startTime');
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const selectedDateOnly = selectedDate instanceof Date 
                ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
                : new Date(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth(), new Date(selectedDate).getDate());
              
              const isToday = selectedDateOnly.getTime() === today.getTime();
              let minTime: string | undefined;
              
              if (isToday && startTime) {
                // Use start time as minimum
                minTime = startTime;
              } else if (isToday) {
                // Use current time as minimum
                minTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
              } else if (startTime) {
                // Use start time as minimum for future dates
                minTime = startTime;
              }
              
              return (
                <Input
                  label="End Time"
                  type="time"
                  value={field.value || ''}
                  min={minTime}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={errors.endTime?.message}
                />
              );
            }}
          />
        </div>
      </div>

      <div>
        <Input
          label="Number of Children"
          type="number"
          min="1"
          {...register('numberOfChildren', { 
            valueAsNumber: true,
            required: 'Number of children is required',
            min: { value: 1, message: 'At least one child is required' },
          })}
          error={errors.numberOfChildren?.message}
        />
      </div>

      <div>
        <label className="label">Ages</label>
        <div className="space-y-2">
          {Array.from({ length: numberOfChildren }).map((_, index) => {
            const ageValue = watch(`ages.${index}` as const);
            // Extract value and unit from age object
            const normalizedValue = ageValue?.value || 1;
            const normalizedUnit = (ageValue?.unit === 'months' || ageValue?.unit === 'years') 
              ? ageValue.unit 
              : 'years';
            
            return (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="1"
                    max={normalizedUnit === 'months' ? '24' : '18'}
                    placeholder={`Age ${index + 1}`}
                    defaultValue={normalizedValue}
                    {...register(`ages.${index}.value` as const, { 
                      valueAsNumber: true,
                      required: `Age ${index + 1} is required`,
                      min: { value: 1, message: 'Age must be 1 or greater' },
                      max: { 
                        value: normalizedUnit === 'months' ? 24 : 18, 
                        message: normalizedUnit === 'months' ? 'Age must be 24 months or less' : 'Age must be 18 years or less' 
                      },
                      setValueAs: (value) => {
                        const num = Number(value);
                        return isNaN(num) ? 1 : Math.max(1, num);
                      },
                    })}
                    error={errors.ages?.[index]?.value?.message}
                  />
                </div>
                <div className="w-32">
                  <select
                    className="input-field"
                    defaultValue={normalizedUnit}
                    {...register(`ages.${index}.unit` as const, { 
                      required: 'Unit is required',
                    })}
                    onChange={(e) => {
                      const unit = e.target.value as 'months' | 'years';
                      setValue(`ages.${index}.unit` as const, unit);
                      // Update max value when unit changes
                      const currentValue = watch(`ages.${index}.value` as const);
                      if (unit === 'months' && currentValue > 24) {
                        setValue(`ages.${index}.value` as const, 24);
                      } else if (unit === 'years' && currentValue > 18) {
                        setValue(`ages.${index}.value` as const, 18);
                      }
                    }}
                  >
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
        {errors.ages && typeof errors.ages.message === 'string' && (
          <p className="mt-1 text-sm text-red-600">{errors.ages.message}</p>
        )}
      </div>

      <div>
        <Input
          label="Location"
          {...register('location', { required: 'Location is required' })}
          error={errors.location?.message}
        />
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          className="input-field"
          rows={3}
          {...register('notes')}
        />
      </div>

      <div>
        <label className="label">Schedule/Routine</label>
        <textarea
          className="input-field"
          rows={3}
          {...register('schedule')}
        />
      </div>

      <div>
        <Input
          label="Minimum Notice (hours)"
          type="number"
          min="1"
          {...register('minNoticeHours', { 
            valueAsNumber: true,
            required: 'Minimum notice is required',
            min: { value: 1, message: 'Must be at least 1 hour' },
          })}
          error={errors.minNoticeHours?.message}
        />
      </div>


      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
};

