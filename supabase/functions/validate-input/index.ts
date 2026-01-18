import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Record<string, string>;
}

// Validation rules
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 255;
const MAX_TEXT_LENGTH = 1000;

// Pattern for allowed characters in names (letters, numbers, spaces, common punctuation)
const NAME_PATTERN = /^[\p{L}\p{N}\s\-'.,&()]+$/u;
// Email validation pattern
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeString(input: string): string {
  // Remove null bytes and control characters except newlines/tabs
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

function validateContractor(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, string> = {};

  // Validate full_name
  if (!data.full_name || typeof data.full_name !== 'string') {
    errors.push('Full name is required');
  } else {
    const name = sanitizeString(data.full_name);
    if (name.length === 0) {
      errors.push('Full name cannot be empty');
    } else if (name.length > MAX_NAME_LENGTH) {
      errors.push(`Full name must be less than ${MAX_NAME_LENGTH} characters`);
    } else if (!NAME_PATTERN.test(name)) {
      errors.push('Full name contains invalid characters');
    } else {
      sanitized.full_name = name;
    }
  }

  // Validate email
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else {
    const email = sanitizeString(data.email).toLowerCase();
    if (email.length === 0) {
      errors.push('Email cannot be empty');
    } else if (email.length > MAX_EMAIL_LENGTH) {
      errors.push(`Email must be less than ${MAX_EMAIL_LENGTH} characters`);
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.push('Invalid email format');
    } else {
      sanitized.email = email;
    }
  }

  // Validate role
  if (data.role !== undefined && data.role !== null) {
    if (typeof data.role !== 'string') {
      errors.push('Role must be a string');
    } else {
      const role = sanitizeString(data.role);
      if (role.length > MAX_NAME_LENGTH) {
        errors.push(`Role must be less than ${MAX_NAME_LENGTH} characters`);
      } else {
        sanitized.role = role;
      }
    }
  }

  // Validate phone (optional)
  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string') {
      errors.push('Phone must be a string');
    } else {
      const phone = sanitizeString(data.phone);
      // Basic phone validation - allow digits, spaces, +, -, (), and dots
      if (!/^[\d\s+\-().]+$/.test(phone)) {
        errors.push('Phone contains invalid characters');
      } else if (phone.length > 50) {
        errors.push('Phone must be less than 50 characters');
      } else {
        sanitized.phone = phone;
      }
    }
  }

  // Validate bank_wallet_details (optional)
  if (data.bank_wallet_details !== undefined && data.bank_wallet_details !== null && data.bank_wallet_details !== '') {
    if (typeof data.bank_wallet_details !== 'string') {
      errors.push('Bank/wallet details must be a string');
    } else {
      const details = sanitizeString(data.bank_wallet_details);
      if (details.length > MAX_TEXT_LENGTH) {
        errors.push(`Bank/wallet details must be less than ${MAX_TEXT_LENGTH} characters`);
      } else {
        sanitized.bank_wallet_details = details;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

function validateProject(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, string> = {};

  // Validate name
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Project name is required');
  } else {
    const name = sanitizeString(data.name);
    if (name.length === 0) {
      errors.push('Project name cannot be empty');
    } else if (name.length > MAX_NAME_LENGTH) {
      errors.push(`Project name must be less than ${MAX_NAME_LENGTH} characters`);
    } else if (!NAME_PATTERN.test(name)) {
      errors.push('Project name contains invalid characters');
    } else {
      sanitized.name = name;
    }
  }

  // Validate client_name
  if (!data.client_name || typeof data.client_name !== 'string') {
    errors.push('Client name is required');
  } else {
    const clientName = sanitizeString(data.client_name);
    if (clientName.length === 0) {
      errors.push('Client name cannot be empty');
    } else if (clientName.length > MAX_NAME_LENGTH) {
      errors.push(`Client name must be less than ${MAX_NAME_LENGTH} characters`);
    } else if (!NAME_PATTERN.test(clientName)) {
      errors.push('Client name contains invalid characters');
    } else {
      sanitized.client_name = clientName;
    }
  }

  // Validate notes (optional)
  if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
    if (typeof data.notes !== 'string') {
      errors.push('Notes must be a string');
    } else {
      const notes = sanitizeString(data.notes);
      if (notes.length > MAX_TEXT_LENGTH) {
        errors.push(`Notes must be less than ${MAX_TEXT_LENGTH} characters`);
      } else {
        sanitized.notes = notes;
      }
    }
  }

  // Validate total_budget
  if (data.total_budget !== undefined) {
    const budget = Number(data.total_budget);
    if (isNaN(budget) || budget < 0) {
      errors.push('Total budget must be a positive number');
    } else if (budget > 999999999999) {
      errors.push('Total budget exceeds maximum allowed value');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();

    console.log(`Validating ${type} input:`, JSON.stringify(data));

    let result: ValidationResult;

    switch (type) {
      case 'contractor':
        result = validateContractor(data);
        break;
      case 'project':
        result = validateProject(data);
        break;
      default:
        result = { valid: false, errors: ['Unknown validation type'] };
    }

    console.log(`Validation result for ${type}:`, JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.valid ? 200 : 400,
    });
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, errors: ['Server error during validation'] }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
