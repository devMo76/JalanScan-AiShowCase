export interface Report {
  id: number;
  image_path: string;
  damage_type: string;
  confidence: number;
  severity: "High" | "Medium" | "Low";
  latitude: number;
  longitude: number;
  status: "Pending" | "In Progress" | "Fixed";
  timestamp: string;
}

export interface SubmitResponse {
  success: boolean;
  damage_type?: string;
  confidence?: number;
  severity?: string;
  result_image?: string;
  detected?: boolean;
  timestamp?: string;
  error?: string;
}
