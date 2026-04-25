/**
 * Form generation orchestration
 * Implements Phase 3, Item 9: generateForms() orchestration
 */

import { renderPdf, RenderOptions } from '../renderer/pdfRenderer';
import { formRegistry } from './FormRegistry';

export interface FormGenerationRequest {
  formType: string;
  data: Record<string, any>;
  pageOffsets?: Record<number, { x: number; y: number }>;
  maxLines?: Record<string, number>;
  overflowStrategy?: 'truncate' | 'shrink' | 'continue';
}

export interface GeneratedForm {
  formType: string;
  pdf: Uint8Array;
  success: boolean;
  error?: string;
}

/**
 * Decide which forms to generate based on data
 * This is a placeholder - real implementation would contain business logic
 */
export function decideForms(data: Record<string, any>): string[] {
  const forms: string[] = [];
  
  // Example logic - customize based on your needs
  if (data.applicationType === 'commercial') {
    forms.push('acord-126');
  }
  if (data.hasLosses) {
    forms.push('acord-130');
  }
  if (data.certificateRequest) {
    forms.push('acord-125');
  }
  
  return forms;
}

/**
 * Generate a single form PDF
 */
export async function generateForm(
  request: FormGenerationRequest,
  templateBytes: Uint8Array
): Promise<GeneratedForm> {
  try {
    const formBundle = formRegistry.getForm(request.formType);
    
    if (!formBundle) {
      return {
        formType: request.formType,
        pdf: new Uint8Array(),
        success: false,
        error: `Form ${request.formType} not found in registry`,
      };
    }
    
    const renderOptions: RenderOptions = {
      pdfTemplate: templateBytes,
      layout: formBundle.schema.layout,
      mapping: formBundle.schema.mapping,
      transforms: formBundle.schema.transforms,
      data: request.data,
      tables: formBundle.schema.tables,
      pageOffsets: request.pageOffsets,
      maxLines: request.maxLines,
      overflowStrategy: request.overflowStrategy,
    };
    
    const pdf = await renderPdf(renderOptions);
    
    return {
      formType: request.formType,
      pdf,
      success: true,
    };
  } catch (error) {
    return {
      formType: request.formType,
      pdf: new Uint8Array(),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate multiple forms from data
 * Main orchestration function
 */
export async function generateForms(
  data: Record<string, any>,
  templates: Record<string, Uint8Array>
): Promise<GeneratedForm[]> {
  // Decide which forms to generate
  const formTypes = decideForms(data);
  
  // Generate each form
  const results = await Promise.all(
    formTypes.map((formType) => {
      const template = templates[formType];
      
      if (!template) {
        return Promise.resolve({
          formType,
          pdf: new Uint8Array(),
          success: false,
          error: `Template for ${formType} not provided`,
        });
      }
      
      return generateForm(
        {
          formType,
          data,
        },
        template
      );
    })
  );
  
  return results;
}
