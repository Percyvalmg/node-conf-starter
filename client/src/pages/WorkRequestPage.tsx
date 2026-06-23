import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSkills } from '../hooks/useSkills';
import { useRoles } from '../hooks/useRoles';
import { useCreateWorkRequest } from '../hooks/useCreateWorkRequest';
import { UrgencyLevel, WorkRequestInput } from '../types';

interface FormErrors {
  title?: string;
  description?: string;
  requiredSkills?: string;
  requiredRoles?: string;
  urgencyLevel?: string;
  durationWeeks?: string;
}

const URGENCY_LEVELS: UrgencyLevel[] = ['Critical', 'High', 'Medium', 'Low'];

function validateForm(values: {
  title: string;
  description: string;
  requiredSkills: string[];
  requiredRoles: string[];
  urgencyLevel: string;
  durationWeeks: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (!values.title.trim()) {
    errors.title = 'Title is required';
  } else if (values.title.trim().length > 150) {
    errors.title = 'Title must be 150 characters or fewer';
  }

  if (values.description.length > 2000) {
    errors.description = 'Description must be 2000 characters or fewer';
  }

  if (values.requiredSkills.length === 0) {
    errors.requiredSkills = 'Select at least 1 skill';
  } else if (values.requiredSkills.length > 20) {
    errors.requiredSkills = 'Select no more than 20 skills';
  }

  if (values.requiredRoles.length === 0) {
    errors.requiredRoles = 'Select at least 1 role';
  } else if (values.requiredRoles.length > 10) {
    errors.requiredRoles = 'Select no more than 10 roles';
  }

  if (!values.urgencyLevel) {
    errors.urgencyLevel = 'Select an urgency level';
  }

  const duration = Number(values.durationWeeks);
  if (!values.durationWeeks) {
    errors.durationWeeks = 'Duration is required';
  } else if (!Number.isInteger(duration) || duration < 1 || duration > 104) {
    errors.durationWeeks = 'Duration must be between 1 and 104 weeks';
  }

  return errors;
}

export function WorkRequestPage() {
  const navigate = useNavigate();
  const skills = useSkills();
  const roles = useRoles();
  const { state: submitState, submit, clearError } = useCreateWorkRequest();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [urgencyLevel, setUrgencyLevel] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
    if (submitted) {
      setErrors((prev) => ({ ...prev, requiredSkills: undefined }));
    }
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    if (submitted) {
      setErrors((prev) => ({ ...prev, requiredRoles: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    clearError();

    const validationErrors = validateForm({
      title,
      description,
      requiredSkills: selectedSkills,
      requiredRoles: selectedRoles,
      urgencyLevel,
      durationWeeks,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    const input: WorkRequestInput = {
      title: title.trim(),
      description: description.trim(),
      requiredSkills: selectedSkills,
      requiredRoles: selectedRoles,
      urgencyLevel: urgencyLevel as UrgencyLevel,
      durationWeeks: Number(durationWeeks),
    };

    const result = await submit(input);

    if (result?.id) {
      navigate(`/work-requests/${result.id}`);
    }
    // On failure, form data is retained automatically (state is not cleared)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Work Request</h1>

      {submitState.error && (
        <div
          role="alert"
          className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
        >
          {submitState.error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="Create work request">
        {/* Title */}
        <div className="mb-5">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title <span aria-hidden="true">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (submitted) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            maxLength={150}
            required
            aria-required="true"
            aria-invalid={!!errors.title || !!submitState.fieldErrors?.title}
            aria-describedby={errors.title || submitState.fieldErrors?.title ? 'title-error' : undefined}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.title || submitState.fieldErrors?.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter a descriptive title for the work request"
          />
          {(errors.title || submitState.fieldErrors?.title) && (
            <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.title || submitState.fieldErrors?.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="mb-5">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (submitted) setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            maxLength={2000}
            rows={4}
            aria-invalid={!!errors.description || !!submitState.fieldErrors?.description}
            aria-describedby={
              errors.description || submitState.fieldErrors?.description
                ? 'description-error'
                : 'description-hint'
            }
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.description || submitState.fieldErrors?.description
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
            placeholder="Describe the delivery need (optional)"
          />
          <p id="description-hint" className="mt-1 text-xs text-gray-500">
            {description.length}/2000 characters
          </p>
          {(errors.description || submitState.fieldErrors?.description) && (
            <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.description || submitState.fieldErrors?.description}
            </p>
          )}
        </div>

        {/* Skills Selector */}
        <fieldset className="mb-5">
          <legend className="block text-sm font-medium text-gray-700 mb-1">
            Required Skills <span aria-hidden="true">*</span>
            <span className="ml-2 text-xs text-gray-500">
              ({selectedSkills.length}/20 selected)
            </span>
          </legend>
          {skills.isLoading && <p className="text-sm text-gray-500">Loading skills...</p>}
          {skills.error && (
            <div className="text-sm text-red-600">
              <p>{skills.error}</p>
              <button
                type="button"
                onClick={skills.retry}
                className="mt-1 text-indigo-600 hover:text-indigo-800 underline"
              >
                Retry
              </button>
            </div>
          )}
          {skills.data && (
            <div
              className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto"
              role="group"
              aria-label="Available skills"
              aria-describedby={errors.requiredSkills ? 'skills-error' : undefined}
            >
              {skills.data.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                const isDisabled = !isSelected && selectedSkills.length >= 20;
                return (
                  <label
                    key={skill}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                        : isDisabled
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleSkill(skill)}
                      className="sr-only"
                      aria-label={skill}
                    />
                    <span>{skill}</span>
                    {isSelected && (
                      <span className="ml-1.5 text-indigo-600" aria-hidden="true">
                        ×
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          {(errors.requiredSkills || submitState.fieldErrors?.requiredSkills) && (
            <p id="skills-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.requiredSkills || submitState.fieldErrors?.requiredSkills}
            </p>
          )}
        </fieldset>

        {/* Roles Selector */}
        <fieldset className="mb-5">
          <legend className="block text-sm font-medium text-gray-700 mb-1">
            Required Roles <span aria-hidden="true">*</span>
            <span className="ml-2 text-xs text-gray-500">
              ({selectedRoles.length}/10 selected)
            </span>
          </legend>
          {roles.isLoading && <p className="text-sm text-gray-500">Loading roles...</p>}
          {roles.error && (
            <div className="text-sm text-red-600">
              <p>{roles.error}</p>
              <button
                type="button"
                onClick={roles.retry}
                className="mt-1 text-indigo-600 hover:text-indigo-800 underline"
              >
                Retry
              </button>
            </div>
          )}
          {roles.data && (
            <div
              className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50"
              role="group"
              aria-label="Available roles"
              aria-describedby={errors.requiredRoles ? 'roles-error' : undefined}
            >
              {roles.data.map((role) => {
                const isSelected = selectedRoles.includes(role);
                const isDisabled = !isSelected && selectedRoles.length >= 10;
                return (
                  <label
                    key={role}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isDisabled
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleRole(role)}
                      className="sr-only"
                      aria-label={role}
                    />
                    <span>{role}</span>
                    {isSelected && (
                      <span className="ml-1.5 text-emerald-600" aria-hidden="true">
                        ×
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          {(errors.requiredRoles || submitState.fieldErrors?.requiredRoles) && (
            <p id="roles-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.requiredRoles || submitState.fieldErrors?.requiredRoles}
            </p>
          )}
        </fieldset>

        {/* Urgency Level */}
        <fieldset className="mb-5">
          <legend className="block text-sm font-medium text-gray-700 mb-1">
            Urgency Level <span aria-hidden="true">*</span>
          </legend>
          <div
            className="flex flex-wrap gap-4"
            role="radiogroup"
            aria-label="Urgency level"
            aria-describedby={errors.urgencyLevel ? 'urgency-error' : undefined}
          >
            {URGENCY_LEVELS.map((level) => (
              <label
                key={level}
                className={`inline-flex items-center px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  urgencyLevel === level
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="urgencyLevel"
                  value={level}
                  checked={urgencyLevel === level}
                  onChange={(e) => {
                    setUrgencyLevel(e.target.value);
                    if (submitted) setErrors((prev) => ({ ...prev, urgencyLevel: undefined }));
                  }}
                  className="sr-only"
                  aria-label={level}
                />
                <span className="text-sm font-medium">{level}</span>
              </label>
            ))}
          </div>
          {(errors.urgencyLevel || submitState.fieldErrors?.urgencyLevel) && (
            <p id="urgency-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.urgencyLevel || submitState.fieldErrors?.urgencyLevel}
            </p>
          )}
        </fieldset>

        {/* Duration */}
        <div className="mb-6">
          <label htmlFor="durationWeeks" className="block text-sm font-medium text-gray-700 mb-1">
            Duration (weeks) <span aria-hidden="true">*</span>
          </label>
          <input
            id="durationWeeks"
            type="number"
            min={1}
            max={104}
            step={1}
            value={durationWeeks}
            onChange={(e) => {
              setDurationWeeks(e.target.value);
              if (submitted) setErrors((prev) => ({ ...prev, durationWeeks: undefined }));
            }}
            required
            aria-required="true"
            aria-invalid={!!errors.durationWeeks || !!submitState.fieldErrors?.durationWeeks}
            aria-describedby={
              errors.durationWeeks || submitState.fieldErrors?.durationWeeks
                ? 'duration-error'
                : 'duration-hint'
            }
            className={`w-full max-w-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.durationWeeks || submitState.fieldErrors?.durationWeeks
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
            placeholder="e.g. 12"
          />
          <p id="duration-hint" className="mt-1 text-xs text-gray-500">
            Between 1 and 104 weeks
          </p>
          {(errors.durationWeeks || submitState.fieldErrors?.durationWeeks) && (
            <p id="duration-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.durationWeeks || submitState.fieldErrors?.durationWeeks}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitState.isSubmitting}
          className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitState.isSubmitting ? 'Submitting...' : 'Submit Work Request'}
        </button>
      </form>
    </div>
  );
}
