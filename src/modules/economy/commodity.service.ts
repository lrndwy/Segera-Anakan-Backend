import type { DatabaseClient } from '../../db/client';
import { CommodityRepository, type CommodityCatalogItem } from './commodity.repository';
import type { ListCommoditiesQuery } from './commodity.schema';

export class CommodityService {
  private readonly commodityRepository: CommodityRepository;

  constructor(db: DatabaseClient) {
    this.commodityRepository = new CommodityRepository(db);
  }

  async findAllPublic(query: ListCommoditiesQuery): Promise<CommodityCatalogItem[]> {
    return this.commodityRepository.findAllCatalog(query.search);
  }
}
