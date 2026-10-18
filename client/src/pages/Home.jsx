import cms from '../cms/homepage.json';
import { BestSellers, BrandPromise, CategoryMosaic, Hero, Lookbook, NewInRail, Newsletter, ReviewsCarousel, ShopTheLook, UnstitchedSpotlight } from '../components/home/sections.jsx';

export default function Home() {
  return (
    <>
      <Hero config={cms.hero} />
      <CategoryMosaic items={cms.mosaic} />
      <NewInRail />
      <ShopTheLook config={cms.shopTheLook} />
      <UnstitchedSpotlight config={cms.unstitched} />
      <BestSellers tabs={cms.bestSellerTabs} />
      <BrandPromise />
      <ReviewsCarousel />
      <Lookbook images={cms.lookbook} />
      <Newsletter />
    </>
  );
}
