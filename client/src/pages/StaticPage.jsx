import { useParams } from 'react-router-dom';
import { ErrorPage, Img, Reveal } from '../components/ui.jsx';
import { useSettings } from '../hooks/index.js';
import { IMG } from '../services/mock/seedData.js';

// Placeholder content — replaced by CMS pages in Prompt 3 (same shape: title, intro, image, sections[]).
const PAGES = {
  about: { title: 'Our Story', intro: 'Fashionist began in Multan with a simple belief: clothing should carry the stories of the people who wear it.', image: IMG.rack, sections: [['The Atelier', 'Every piece is designed in-house and finished by artisans across Punjab and Sindh — hand embroidery, tilla, gota and block print.'], ['Our Promise', 'Authentic fabrics, honest prices, Cash on Delivery to every city in Pakistan, and 7-day easy returns.']] },
  contact: { title: 'Contact Us', intro: 'We are here Monday to Saturday, 10am – 8pm PKT.', image: IMG.rack2, sections: [] },
  shipping: { title: 'Shipping', intro: 'We deliver nationwide via trusted courier partners.', sections: [['Delivery times', 'Major cities: 2–3 working days. Other cities: 3–5 working days.'], ['Delivery fee', 'Multan PKR 150; other cities from PKR 200–250. Free delivery on orders above PKR 5,000.'], ['Payment', 'Cash on Delivery only — pay the rider when your parcel arrives.']] },
  returns: { title: 'Returns & Exchanges', intro: 'Changed your mind? You have 7 days from delivery.', sections: [['How to request', 'Go to Account → Orders, open your delivered order and choose Return / Exchange.'], ['Conditions', 'Items must be unworn, unwashed and with original tags. Unstitched fabric that has been cut cannot be returned.'], ['Refunds', 'Approved returns are refunded by bank transfer or JazzCash/Easypaisa within 5 working days.']] },
  privacy: { title: 'Privacy Policy', intro: 'Your trust matters. We only collect what we need to deliver your order.', sections: [['What we collect', 'Name, phone, email and delivery address.'], ['How we use it', 'To process orders, contact you about delivery and — only if you opt in — send our newsletter.'], ['Security', 'Passwords are hashed; we never sell your data.']] },
  faq: { title: 'FAQ', intro: 'Answers to what our customers ask most.', sections: [['Do you offer Cash on Delivery?', 'Yes — COD is our only payment method, available nationwide.'], ['How do I find my size?', 'Every product page has a size guide. If you are between sizes, choose the larger one.'], ['Can I change my order?', 'You can cancel while the order is still Pending from your account.']] },
};

export default function StaticPage() {
  const { slug } = useParams();
  const s = useSettings();
  const page = PAGES[slug];
  if (!page) return <ErrorPage />;
  return (
    <article>
      <header className="container-site grid gap-10 border-b border-line py-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="label text-gold">Fashionist</p>
          <h1 className="mt-4 text-6xl md:text-8xl">{page.title}</h1>
          <p className="mt-8 max-w-xl font-display text-2xl italic text-muted">{page.intro}</p>
        </div>
        {page.image && <Img src={page.image} alt="" className="aspect-[4/3] lg:col-span-5" />}
      </header>
      <div className="container-site max-w-3xl py-16">
        {page.sections.map(([h, p], i) => (
          <Reveal key={h} delay={i * 0.05} className="border-b border-line py-8">
            <h2 className="text-3xl">{h}</h2>
            <p className="mt-3 leading-relaxed text-muted">{p}</p>
          </Reveal>
        ))}
        {slug === 'contact' && s && (
          <dl className="grid gap-8 sm:grid-cols-2">
            {[['Phone', s.store.phone], ['Email', s.store.email], ['WhatsApp', <a key="w" className="underline" href={`https://wa.me/${s.store.whatsapp}`}>Chat with us</a>], ['Studio', s.store.address]].map(([k, v]) => (
              <div key={k}><dt className="label text-gold">{k}</dt><dd className="mt-2 font-display text-2xl">{v}</dd></div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}
