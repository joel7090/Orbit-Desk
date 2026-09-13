/**
 * GDS Systems supported by the learning tool
 */
export type GDSSystem = 'amadeus' | 'galileo' | 'sabre';

/**
 * Represent a single typing command step inside the GDS simulator
 */
export interface GDSCommandStep {
  command: string;
  commandDescription: string;
  terminalOutput: string;
  isHighlighted?: boolean;
  pnrRequired?: boolean;
  appendPnrLine?: boolean;
  pnrLineTemplate?: string;
  pnrLinePosition?: "top" | "middle" | "bottom";
}

/**
 * Structure returned by our AI assistant or preset system
 */
export interface GDSResponse {
  explanation: string;
  gds_name: string;
  steps: GDSCommandStep[];
  isSandbox?: boolean;
  pnrRequired?: boolean;
  appendPnrLine?: boolean;
  pnrLineTemplate?: string;
  pnrLinePosition?: "top" | "middle" | "bottom";
}

/**
 * Predefined learning scenarios in case of offline usage or quick loading
 */
export interface GDSPresetScenario {
  id: string;
  title: string;
  category: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  amadeus: GDSResponse;
  galileo: GDSResponse;
  sabre: GDSResponse;
}
