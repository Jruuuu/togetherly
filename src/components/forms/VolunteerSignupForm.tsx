import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { volunteerSignupSchema } from '../../utils/validation';

const formSchema = volunteerSignupSchema;

type FormData = z.infer<typeof formSchema>;

interface VolunteerSignupFormProps {
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export const VolunteerSignupForm: React.FC<VolunteerSignupFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reminders: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'reminders',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          label="Full Name"
          {...register('name')}
          error={errors.name?.message}
          required
        />
      </div>

      <div>
        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          required
        />
      </div>

      <div>
        <Input
          label="Phone Number"
          type="tel"
          {...register('phone')}
          error={errors.phone?.message}
          required
        />
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Reminders (Optional - Up to 3)
          </label>
          {fields.length < 3 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ value: 1, unit: 'days' })}
              className="text-sm py-1 px-3"
            >
              + Add Reminder
            </Button>
          )}
        </div>
        
        {fields.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">
            No reminders set. Click "Add Reminder" to set up notifications.
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start p-3 border border-gray-200 rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register(`reminders.${index}.value`, {
                      valueAsNumber: true,
                    })}
                    className="input-field w-full"
                    placeholder="1"
                  />
                  {errors.reminders?.[index]?.value && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {errors.reminders[index]?.value?.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Unit
                  </label>
                  <select
                    {...register(`reminders.${index}.unit`)}
                    className="input-field w-full"
                  >
                    <option value="weeks">Weeks</option>
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                  </select>
                  {errors.reminders?.[index]?.unit && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {errors.reminders[index]?.unit?.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="mt-6 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        
        {errors.reminders && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.reminders.message}
          </p>
        )}
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Submitting...' : 'Sign Up'}
        </Button>
      </div>
    </form>
  );
};

