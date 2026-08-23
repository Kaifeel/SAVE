export type CatalogItemType = 'LEND' | 'BORROW';
export type CatalogItemStatus = 'AVAILABLE' | 'REQUEST_PENDING' | 'RESERVED' | 'RENTED' | 'DELETED';

export type CatalogItem = {
  id: number;
  ownerId: number;
  ownerName: string;
  ownerUniversityId: number | null;
  ownerUniversityName: string | null;
  type: CatalogItemType;
  title: string;
  rentalFee: number;
  rentalUnit: string;
  pickupLocationId: number | null;
  pickupLocationName: string | null;
  description: string;
  precautions: string | null;
  status: CatalogItemStatus;
  imageUrls: string[];
  viewCount: number;
  wishlistCount: number;
  wishlisted: boolean;
  ownerRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CatalogPage = {
  content: CatalogItem[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
};

export type RecommendationSummary = {
  id: number;
  headline: string;
  reasons: string[];
  keywords: string[];
  items: CatalogItem[];
  department: string;
  interestItems: string[];
  timePeriod: string;
  isExamPeriod: boolean;
  weatherStatus: string;
  createdAt: string;
};

export type RecommendationInput = {
  department: string;
  interestItems: string[];
  timePeriod: string;
  isExamPeriod: boolean;
  weatherStatus: string;
};
