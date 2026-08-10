import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Truck, RefreshCw, Lock } from 'lucide-react'

const POLICY_DATA = {
  'privacy-policy': {
    title: 'Privacy Policy',
    updatedAt: 'May 2026',
    icon: Lock,
    content: (
      <div className="space-y-8">
        <div className="text-lg font-medium text-neutral-800 leading-relaxed space-y-4">
          <p><strong>Effective Date:</strong> 1st of May, 2026</p>
          <p>Welcome to Samay (“Company”, “we”, “our”, or “us”).</p>
          <p>The Company values the trust, confidence, and privacy of its customers, website visitors, and users. This Privacy Policy (“Policy”) explains how we collect, receive, store, use, process, disclose, and protect information obtained through our website, communication channels, online platforms, customer interactions, and related services.</p>
          <p>This Policy is intended to provide transparency regarding the Company’s privacy practices and to help users understand how their information may be handled while interacting with us. By accessing our website, placing an order, creating an account, subscribing to communications, contacting customer support, or otherwise interacting with the Company, you acknowledge that you have read, understood, and agreed to the practices described in this Privacy Policy.</p>
          <p className="italic text-neutral-500">If you do not agree with the terms of this Policy, you are advised not to access or use the website or related services.</p>
        </div>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">01</span>
             Scope of this Privacy Policy
          </h3>
          <p>
            This Privacy Policy applies to all visitors, users, customers, and individuals interacting with the Company through its website, online platforms, customer support channels, advertisements, promotional activities, or authorized business operations. The Policy governs information collected through digital interactions, communication platforms, retail interactions, and other lawful business activities carried out by the Company.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">02</span>
             Information We Collect
          </h3>
          <p>
            The Company may collect personal, technical, transactional, and behavioral information depending upon the nature of interaction with the website or services. Information may be collected directly from users, automatically through technological systems, or through authorized third-party service providers assisting the Company in its business operations.
          </p>
          <p>
            Personal information collected by the Company may include details such as the customer’s full name, mobile number, email address, billing and shipping address, city and postal details, order history, purchase records, account credentials, communication history, and information voluntarily submitted during inquiries, customer support interactions, reviews, or promotional participation.
          </p>
          <p>
            When users create accounts or place orders, the Company may also maintain information relating to account activity, saved addresses, transaction records, preferences, and customer service communications for purposes including order fulfillment, customer support, warranty coordination, fraud prevention, and operational management.
          </p>
          <p>
            Payments made through the website may be processed through authorized third-party payment gateway providers and financial institutions. The Company does not store complete debit card details, credit card information, CVV numbers, UPI PINs, internet banking credentials, or other sensitive financial authentication information on its own systems. Payment processing remains subject to the terms, security standards, and privacy practices of the respective payment service providers.
          </p>
          <p>
            The Company may additionally collect certain technical and device-related information automatically when users access or interact with the website. Such information may include IP address, browser type, operating system, device identifiers, approximate geographic location, browsing behavior, session information, interaction patterns, clickstream activity, referring URLs, and analytical data. This information assists the Company in improving website performance, enhancing user experience, monitoring security, detecting fraud, and understanding customer engagement patterns.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">03</span>
             Cookies & Tracking Technologies
          </h3>
          <p>
            The website may use cookies, pixels, scripts, tags, web beacons, and similar tracking technologies for operational, analytical, personalization, advertising, and performance-related purposes. These technologies may help the Company remember user preferences, maintain website functionality, analyze website traffic, improve customer experience, monitor marketing performance, and optimize advertising effectiveness.
          </p>
          <p>
            Third-party service providers, analytics platforms, advertising partners, and social media platforms may also use tracking technologies on the website in accordance with their own policies and operational practices.
          </p>
          <p>
            Users may choose to disable cookies through browser settings; however, certain features or functionalities of the website may become unavailable or may not function properly as a result.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">04</span>
             How We Use Information
          </h3>
          <p>
            The Company may use collected information for legitimate business, operational, legal, analytical, and customer service purposes. Such purposes may include processing and fulfilling orders, verifying payments, coordinating shipping and delivery, managing customer accounts, responding to inquiries, providing customer support, detecting fraudulent activity, improving website functionality, enhancing user experience, conducting business analytics, maintaining operational security, administering promotional campaigns, sending marketing communications, providing product recommendations, and complying with legal or regulatory obligations.
          </p>
          <p>
            The Company may also use information to improve overall service quality, personalize customer experiences, maintain internal records, resolve disputes, enforce policies, and support warranty-related or after-sales service processes.
          </p>
          <p>
            Aggregated or anonymized data that does not directly identify individuals may additionally be used for analytical, research, operational, or commercial purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">05</span>
             Marketing & Communication Consent
          </h3>
          <p>
            By providing contact details including mobile number or email address, users may receive communications from the Company relating to orders, shipping updates, payment confirmations, customer support, service notifications, promotional campaigns, newsletters, marketing offers, and brand-related announcements where permitted under applicable laws.
          </p>
          <p>
            Communication may occur through email, SMS, WhatsApp, phone calls, push notifications, or other authorized communication channels used by the Company.
          </p>
          <p>
            Users may opt out of receiving promotional or marketing communication at any time by following applicable unsubscribe instructions, contacting customer support, or requesting removal through official communication channels. However, operational or transactional communication necessary for order processing, customer support, legal compliance, or account-related matters may still continue.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">06</span>
             Information Sharing & Disclosure
          </h3>
          <p>
            The Company does not sell, rent, or unlawfully trade customer personal information to unrelated third parties for unauthorized commercial purposes.
          </p>
          <p>
            However, information may be shared with authorized third parties where reasonably necessary for legitimate operational, commercial, technical, legal, or compliance-related purposes. Such parties may include payment gateway providers, banks, courier and logistics partners, shipping aggregators, technology service providers, cloud hosting providers, analytics platforms, customer relationship management systems, fraud prevention services, marketing partners, auditors, legal advisors, consultants, insurers, regulatory authorities, law enforcement agencies, or government bodies where disclosure is required under applicable laws.
          </p>
          <p>
            The Company may additionally disclose information where reasonably necessary to protect legal rights, prevent fraudulent activity, enforce policies, respond to lawful requests, maintain operational security, or protect the interests of the Company, its users, or the public.
          </p>
          <p>
            Only information reasonably necessary for the respective purpose may be shared with such authorized third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">07</span>
             Data Security & Protection
          </h3>
          <p>
            The Company undertakes commercially reasonable administrative, organizational, technical, and operational safeguards intended to protect information against unauthorized access, misuse, alteration, disclosure, destruction, accidental loss, or cyber-related threats.
          </p>
          <p>
            Such measures may include restricted access controls, secured systems, internal operational procedures, reasonable security practices, and protective technical mechanisms intended to safeguard stored information.
          </p>
          <p>
            However, users acknowledge that no website, internet transmission, online platform, electronic storage system, or digital communication method can be guaranteed to remain completely secure, uninterrupted, or immune from cybersecurity risks. Accordingly, transmission of information through the internet occurs at the user’s own risk.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">08</span>
             Data Retention
          </h3>
          <p>
            The Company may retain personal information for as long as reasonably necessary for purposes including order fulfillment, customer support, warranty coordination, legal compliance, taxation, accounting, fraud prevention, dispute resolution, operational administration, record maintenance, enforcement of agreements, or other legitimate business purposes.
          </p>
          <p>
            Retention periods may vary depending upon the nature of the information, operational requirements, legal obligations, regulatory requirements, or dispute-related considerations. Information may subsequently be deleted, archived, anonymized, or retained in accordance with applicable operational and legal requirements.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">09</span>
             Third-Party Services & External Links
          </h3>
          <p>
            The website may contain links, advertisements, integrations, plugins, or references directing users to third-party websites, applications, or services operated independently from the Company.
          </p>
          <p>
            The Company does not control and shall not be responsible for the privacy practices, security standards, operational policies, content, or activities of such external platforms or third parties.
          </p>
          <p>
            Users are encouraged to independently review applicable privacy policies and terms before interacting with external services or platforms.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">10</span>
             Customer Rights & Data Requests
          </h3>
          <p>
            Subject to applicable laws and reasonable operational limitations, users may request access to personal information maintained by the Company, correction of inaccurate information, updating of account details, withdrawal of consent where applicable, restriction of certain processing activities, or deletion of personal information.
          </p>
          <p>
            The Company reserves the right to retain information where reasonably necessary for legal compliance, fraud prevention, taxation, dispute resolution, operational continuity, policy enforcement, or legitimate commercial interests.
          </p>
          <p>
            The Company may require reasonable identity verification before processing requests relating to personal information or account-related actions.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">11</span>
             Children’s Privacy
          </h3>
          <p>
            The website and services are not intended for individuals below 18 years of age. The Company does not knowingly collect personal information from minors without lawful authorization from a parent or legal guardian.
          </p>
          <p>
            If the Company becomes aware that information relating to a minor has been submitted without appropriate authorization, reasonable efforts may be undertaken to remove such information from applicable systems where feasible and operationally practicable.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">12</span>
             Compliance with Applicable Laws
          </h3>
          <p>
            The Company undertakes commercially reasonable efforts to handle information in accordance with applicable laws relating to privacy, electronic commerce, consumer protection, and data handling practices within India.
          </p>
          <p>
            Nothing contained in this Privacy Policy shall be interpreted as limiting any statutory rights available under applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">13</span>
             Policy Modifications
          </h3>
          <p>
            The Company reserves the right to revise, update, modify, replace, or discontinue this Privacy Policy at any time without prior notice.
          </p>
          <p>
            Any revised version of this Privacy Policy shall become effective immediately upon publication on the website unless otherwise specified. Users are encouraged to periodically review this Policy to remain informed regarding current privacy practices.
          </p>
          <p>
            Continued use of the website or services following any modification to this Privacy Policy constitutes acceptance of the revised Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">14</span>
             Contact Information
          </h3>
          <p>
            For privacy-related concerns, questions, requests, or grievances regarding this Privacy Policy or the Company’s data handling practices, customers may contact:
          </p>
          <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100/80 space-y-2.5 text-neutral-800 text-sm">
            <p><strong>Company Name:</strong> Samay</p>
            <p><strong>Email:</strong> <a href="mailto:support@samaywatch.com" className="font-bold text-black underline hover:text-neutral-700 transition-colors">support@samaywatch.com</a></p>
            <p><strong>Phone:</strong> <a href="tel:+918595513656" className="font-bold text-black underline hover:text-neutral-700 transition-colors">+91 85955 13656</a></p>
            <p><strong>Address:</strong> Shop No.5, New Market, Bara Gole Chakkar, Kamla Nagar, New Delhi, Delhi 110007</p>
          </div>
        </section>
      </div>
    )
  },
  'terms-conditions': {
    title: 'Terms & Conditions',
    updatedAt: 'May 2026',
    icon: ShieldCheck,
    content: (
      <div className="space-y-8">
        <div className="text-lg font-medium text-neutral-800 leading-relaxed space-y-4">
          <p><strong>Effective Date:</strong> 1st of May, 2026</p>
          <p>Welcome to Samay (“Company”, “we”, “our”, or “us”).</p>
          <p>These Terms & Conditions (“Terms”) govern the access, browsing, use, purchase activities, transactions, communications, and overall interaction with the Company’s website, products, services, online platforms, retail operations, and associated business channels.</p>
          <p>These Terms constitute a legally binding agreement between the Company and any individual, customer, visitor, user, purchaser, or entity (“User”, “Customer”, “you”, or “your”) accessing or using the website or purchasing products from the Company.</p>
          <p>By accessing the website, creating an account, browsing products, placing an order, making a payment, subscribing to communications, or otherwise interacting with the Company, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms, along with all related policies referenced herein including but not limited to the Privacy Policy, Shipping, Delivery, Exchange & Warranty Policy, and Authenticity & Product Assurance Policy.</p>
          <p className="italic text-neutral-500">If you do not agree with these Terms, you are advised not to access or use the website or services.</p>
        </div>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">01</span>
             Website Access & Eligibility
          </h3>
          <p>
            The website and services offered by the Company are intended for individuals who are legally capable of entering into binding contracts under applicable laws.
          </p>
          <p>
            By using the website, you represent and warrant that you are at least 18 years of age or are accessing the website under the supervision and consent of a lawful parent or guardian.
          </p>
          <p>
            The Company reserves the right to refuse access, terminate accounts, cancel orders, restrict services, or deny usage to any user at its sole discretion without prior notice where reasonably necessary for operational, legal, security, fraud prevention, or policy enforcement purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">02</span>
             Acceptance of Terms
          </h3>
          <p>
            By accessing the website, browsing products, communicating with the Company, placing an order, or completing a transaction, users expressly acknowledge and agree that they have read and understood these Terms, consent to all applicable policies of the Company, agree to comply with all operational procedures and legal obligations applicable to transactions conducted through the website, and understand that continued use of the website constitutes ongoing acceptance of these Terms and any future modifications thereto.
          </p>
          <p>
            Users additionally acknowledge that acceptance checkboxes, electronic confirmations, digital acknowledgments, order placement actions, payment completion, or continued website usage may constitute legally valid acceptance of these Terms to the fullest extent permitted under applicable laws.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">03</span>
             Products, Brand Representation & Authenticity
          </h3>
          <p>
            The Company operates as a multi-brand watch retailer offering products belonging to various categories including fashion brands, premium brands, luxury brands, sports watches, designer labels, lifestyle brands, and internationally distributed watch manufacturers.
          </p>
          <p>
            All trademarks, logos, product names, images, brand identities, and intellectual property displayed on the website belong to their respective owners unless expressly stated otherwise.
          </p>
          <p>
            The Company undertakes commercially reasonable efforts to ensure that all products offered through its platforms are genuine and sourced through legitimate and authorized channels.
          </p>
          <p>
            However, customers acknowledge that brand packaging, manuals, warranty structures, accessories, inserts, branding presentation, and product representation may vary depending upon manufacturer practices, regional distribution systems, production batches, packaging updates, or brand-level revisions.
          </p>
          <p>
            The Company does not claim ownership over third-party trademarks nor imply exclusive affiliation beyond applicable authorized retail relationships where relevant.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">04</span>
             Product Information, Specifications & Accuracy
          </h3>
          <p>
            The Company undertakes commercially reasonable efforts to ensure that all product descriptions, specifications, pricing, dimensions, images, colors, model references, stock availability, warranty information, and related product details displayed on the website remain accurate and updated.
          </p>
          <p>
            However, despite reasonable operational and technical efforts, occasional human errors, typographical mistakes, pricing discrepancies, specification inaccuracies, synchronization delays, technical glitches, image mismatches, stock update delays, or unintentional omissions may occur.
          </p>
          <p>
            Accordingly, the Company does not guarantee that all information displayed on the website shall always remain completely accurate, current, continuously updated, or entirely error-free.
          </p>
          <p>
            The Company reserves the right, at its sole discretion, to correct inaccuracies, revise pricing, modify specifications, update product information, replace images, discontinue products, limit quantities, refuse transactions, cancel affected orders, or contact customers for clarification prior to order processing.
          </p>
          <p>
            Minor visual variations resulting from photography lighting, screen settings, packaging updates, production variations, or manufacturer revisions shall not be considered defects or grounds for dispute.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">05</span>
             Account Registration & Customer Responsibility
          </h3>
          <p>
            Certain features of the website may require account registration or submission of personal information.
          </p>
          <p>
            Users are responsible for maintaining confidentiality of their account credentials, login information, passwords, and account activity.
          </p>
          <p>
            Users agree to provide accurate, current, complete, and lawful information during registration, checkout, communication, and order placement processes.
          </p>
          <p>
            The Company shall not be liable for losses arising from unauthorized account access, inaccurate customer information, misuse of login credentials, customer negligence, or unauthorized usage occurring through registered accounts.
          </p>
          <p>
            Users additionally agree not to impersonate another individual, submit misleading information, create fraudulent accounts, interfere with website operations, attempt unauthorized system access, introduce malicious software, scrape website content, or engage in unlawful or abusive conduct through the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">06</span>
             Orders, Acceptance & Cancellation Rights
          </h3>
          <p>
            All orders placed through the website shall remain subject to operational review, payment verification, stock availability, fraud screening, and final acceptance by the Company.
          </p>
          <p>
            Order confirmation emails, payment acknowledgments, or transaction receipts shall not automatically constitute final acceptance of an order by the Company.
          </p>
          <p>
            The Company reserves the right to refuse or cancel orders, restrict quantities, hold transactions for verification, request additional documentation, or decline service at its sole discretion without prior notice.
          </p>
          <p>
            Orders may be cancelled or rejected in circumstances including but not limited to pricing inaccuracies, stock unavailability, payment verification issues, suspected fraudulent activity, operational errors, technical failures, duplicate transactions, customer information discrepancies, or violation of these Terms.
          </p>
          <p>
            The Company additionally reserves the right to cancel transactions after order placement where fulfillment becomes commercially impractical, operationally impossible, or legally restricted.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">07</span>
             Pricing, Payments & Taxes
          </h3>
          <p>
            All prices displayed on the website are subject to applicable taxes unless otherwise specified.
          </p>
          <p>
            The Company reserves the right to revise pricing, promotional offers, discounts, availability, or product configurations at any time without prior notice.
          </p>
          <p>
            Payments may be processed through authorized payment gateway providers, banking institutions, financial intermediaries, or digital payment systems approved by the Company.
          </p>
          <p>
            The Company does not store complete payment authentication credentials including CVV numbers, UPI PINs, or banking passwords on its systems.
          </p>
          <p>
            Customers acknowledge that payment authorization remains subject to approval by respective financial institutions and payment processors.
          </p>
          <p>
            The Company shall not be liable for payment failures, banking interruptions, transaction delays, gateway errors, or third-party financial system disruptions beyond its reasonable control.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">08</span>
             Shipping, Delivery & Dispatch
          </h3>
          <p>
            Orders are generally processed and dispatched within approximately 24 to 48 hours from successful payment confirmation, subject to operational conditions and stock availability.
          </p>
          <p>
            Estimated delivery timelines generally range between 3 to 7 business days depending upon delivery location, courier availability, operational circumstances, and logistical conditions.
          </p>
          <p>
            Delivery timelines communicated by the Company are estimates only and shall not be interpreted as guaranteed delivery commitments.
          </p>
          <p>
            The Company shall not be held liable for delays arising from courier partner disruptions, transportation issues, force majeure events, weather conditions, strikes, government restrictions, technical interruptions, regional accessibility limitations, or circumstances beyond reasonable control.
          </p>
          <p>
            Customers are solely responsible for providing accurate delivery information and ensuring availability for shipment receipt.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">09</span>
             No Return & No Refund Policy
          </h3>
          <p>
            All products sold by the Company are governed under a strict No Return and No Refund policy.
          </p>
          <p>
            Once a product has been successfully delivered, returns and refunds shall not be accepted under normal circumstances.
          </p>
          <p>
            By placing an order, customers expressly acknowledge and agree that purchases made through the Company are final, subject only to the limited exchange conditions specifically outlined under applicable Company policies.
          </p>
          <p>
            Requests arising from change of preference, dislike of design, incorrect selection by the customer, expectation mismatch, or subjective dissatisfaction shall not qualify for return, refund, or cancellation.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">10</span>
             Exchange Conditions
          </h3>
          <p>
            The Company may, at its sole discretion, consider exchange requests only under limited circumstances including delivery of incorrect products, manufacturing defects identified upon delivery, substantial mismatch with confirmed order details, or transit-related damage verified by the Company.
          </p>
          <p>
            Exchange requests must be reported within 24 hours from the time of delivery through the Company’s official support channels.
          </p>
          <p>
            Customers may be required to provide photographs, videos, unboxing recordings, packaging evidence, invoices, and additional documentation reasonably necessary for verification purposes.
          </p>
          <p>
            Products must remain unused, untampered, and accompanied by original packaging, accessories, warranty cards, tags, and related materials.
          </p>
          <p>
            The Company reserves the right to reject exchange requests where evidence is insufficient, timelines are exceeded, packaging is tampered, products show signs of usage, or claims appear unverifiable or fraudulent.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">11</span>
             Warranty Disclaimer & Brand Warranty
          </h3>
          <p>
            Products sold by the Company may include applicable manufacturer warranty coverage wherever provided by the respective brand.
          </p>
          <p>
            Warranty duration, exclusions, procedures, and servicing terms shall vary depending upon the respective manufacturer and product category.
          </p>
          <p>
            All warranty-related services, repairs, approvals, replacements, and claims shall remain subject solely to the policies and decisions of the respective brand or authorized service provider.
          </p>
          <p>
            The Company shall not be independently liable for warranty claim approvals or rejections, repair timelines, brand servicing decisions, manufacturer delays, or warranty limitations imposed by respective brands.
          </p>
          <p>
            Customers are advised to preserve original invoices, warranty cards, tags, and related documentation for future servicing and warranty purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">12</span>
             Intellectual Property Rights
          </h3>
          <p>
            All website content including logos, designs, graphics, images, videos, product descriptions, text, layouts, software elements, branding materials, website structure, visual assets, and associated intellectual property belongs to the Company or respective lawful owners and remains protected under applicable intellectual property laws.
          </p>
          <p>
            Users shall not copy, reproduce, distribute, modify, scrape, publish, exploit, transmit, or commercially use website content without prior written authorization from the Company or respective lawful rights holders.
          </p>
          <p>
            Unauthorized usage of intellectual property may result in legal action, account restriction, service denial, or other remedies available under applicable laws.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">13</span>
             User Conduct & Prohibited Activities
          </h3>
          <p>
            Users agree not to use the website for unlawful purposes, engage in fraudulent transactions, interfere with website operations, disrupt security systems, introduce malicious software, attempt unauthorized access, misuse promotional systems, engage in abusive conduct, violate applicable laws, infringe intellectual property rights, or undertake activities capable of harming the Company, its operations, customers, or third parties.
          </p>
          <p>
            The Company reserves the right to suspend accounts, block access, refuse services, report unlawful conduct, or initiate legal proceedings where reasonably necessary.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">14</span>
             Privacy & Data Handling
          </h3>
          <p>
            Customer information collected through the website shall be handled in accordance with the Company’s Privacy Policy.
          </p>
          <p>
            By using the website, users consent to collection, storage, processing, usage, disclosure, and handling of information in accordance with applicable Company policies and operational practices.
          </p>
          <p>
            The Company undertakes commercially reasonable efforts to maintain data security; however, users acknowledge that no internet-based system can guarantee absolute security or uninterrupted operation.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">15</span>
             Fraud Prevention, Order Verification & Security Review
          </h3>
          <p>
            The Company reserves the right to undertake reasonable verification procedures for any order placed through the website in order to prevent fraudulent activity, unauthorized transactions, payment abuse, identity misuse, suspicious purchasing behavior, reseller exploitation, or security-related risks.
          </p>
          <p>
            The Company may, at its sole discretion, request additional verification documents or information including identity proof, billing verification, payment confirmation, contact verification, address confirmation, or other supporting documentation reasonably necessary for transaction validation.
          </p>
          <p>
            Orders identified as suspicious, high-risk, commercially abusive, fraudulent, unauthorized, or inconsistent with normal purchasing behavior may be delayed, placed on hold, restricted, cancelled, or refused without prior notice.
          </p>
          <p>
            The Company additionally reserves the right to blacklist users, accounts, devices, addresses, payment instruments, or transactions associated with fraudulent activity, policy abuse, chargeback misuse, exchange fraud, or operational security concerns.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">16</span>
             Restrictions on Commercial Resale & Bulk Purchases
          </h3>
          <p>
            Products sold by the Company are intended primarily for personal and lawful consumer use unless otherwise expressly authorized by the Company in writing.
          </p>
          <p>
            The Company reserves the right to restrict, refuse, limit, or cancel bulk purchases, reseller activity, commercial redistribution, unauthorized marketplace reselling, export activity, arbitrage purchasing, or transactions suspected to be intended for unauthorized commercial exploitation.
          </p>
          <p>
            The Company may additionally impose quantity limitations on specific products, brands, collections, or promotional offers at its sole discretion.
          </p>
          <p>
            Unauthorized resale or commercial exploitation of products purchased through the Company may result in cancellation of orders, restriction of services, account suspension, refusal of future transactions, or other operational or legal action considered reasonably necessary by the Company.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">17</span>
             Website Availability & Technical Operations Disclaimer
          </h3>
          <p>
            The Company undertakes commercially reasonable efforts to maintain website accessibility, operational continuity, and platform functionality. However, uninterrupted availability of the website or related services cannot be guaranteed at all times.
          </p>
          <p>
            The website may occasionally experience interruptions, downtime, delays, technical errors, maintenance activities, software issues, server failures, internet disruptions, cybersecurity incidents, data synchronization delays, or operational outages beyond the Company’s reasonable control.
          </p>
          <p>
            The Company reserves the right to temporarily suspend, restrict, modify, discontinue, or update any portion of the website, services, content, functionality, or operational systems without prior notice.
          </p>
          <p>
            The Company shall not be liable for losses, inconvenience, delays, data interruptions, failed transactions, or operational disruptions arising from temporary website unavailability, technical failures, or system interruptions.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">18</span>
             Electronic Communications & Digital Consent
          </h3>
          <p>
            By accessing the website, creating an account, placing an order, submitting information, communicating with the Company, or accepting these Terms electronically, users consent to receive communications from the Company through electronic means.
          </p>
          <p>
            Such communication may include emails, SMS, WhatsApp communication, notifications, invoices, account-related communication, legal notices, service announcements, transactional updates, promotional communication, or policy-related notifications.
          </p>
          <p>
            Users acknowledge and agree that electronic records, digital acknowledgments, electronic approvals, online acceptance mechanisms, and electronic communication shall constitute valid and legally enforceable forms of communication and agreement to the fullest extent permitted under applicable laws.
          </p>
          <p>
            Users are responsible for maintaining accurate and active communication details for receipt of important notices and transactional communication.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">19</span>
             Pricing Errors, Technical Glitches & Promotional Discrepancies
          </h3>
          <p>
            Despite commercially reasonable operational efforts, the website may occasionally contain pricing inaccuracies, typographical mistakes, promotional discrepancies, technical errors, coupon malfunctions, system glitches, synchronization delays, or incorrect discount calculations.
          </p>
          <p>
            The Company reserves the right, at its sole discretion, to correct any such errors and to refuse, cancel, revoke, modify, or limit any transaction affected by incorrect pricing, unintended discounts, technical malfunctions, system-generated inaccuracies, promotional abuse, duplicate benefits, or operational display errors.
          </p>
          <p>
            Customers acknowledge that obvious pricing errors, accidental zero pricing, unrealistic discounting, system-generated anomalies, or manifestly incorrect product valuations shall not create binding obligations upon the Company.
          </p>
          <p>
            The Company shall not be obligated to honor transactions arising solely from technical glitches, human mistakes, pricing malfunctions, or unintentional promotional errors.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">20</span>
             Customer Conduct, Abuse & Policy Misuse
          </h3>
          <p>
            Users interacting with the Company agree to maintain lawful, respectful, and reasonable conduct while accessing the website, communicating with representatives, or using Company services.
          </p>
          <p>
            The Company reserves the right to refuse service, restrict communication, suspend accounts, cancel orders, deny future transactions, or initiate legal action where users engage in abusive behavior, threats, harassment, defamatory conduct, fraudulent claims, exchange misuse, payment abuse, chargeback fraud, intentional reputational harm, social media harassment, policy manipulation, or activities reasonably considered harmful to the Company, its operations, employees, representatives, customers, or associated parties.
          </p>
          <p>
            The Company additionally reserves the right to maintain records of abusive or fraudulent conduct for operational security, fraud prevention, and legal enforcement purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">21</span>
             Transfer of Risk & Delivery Responsibility
          </h3>
          <p>
            Risk relating to products purchased from the Company shall transfer to the customer upon successful delivery of the shipment to the delivery address provided during the order process.
          </p>
          <p>
            Where delivery attempts are refused, unattended, delayed due to customer unavailability, or impacted by incorrect delivery information provided by the customer, the Company’s responsibility may be considered fulfilled upon reasonable delivery attempt by the courier or logistics partner.
          </p>
          <p>
            Customers are responsible for inspecting shipments promptly upon delivery and reporting concerns within the timelines specified under applicable Company policies.
          </p>
          <p>
            The Company shall not be liable for damage, loss, misuse, theft, mishandling, or deterioration occurring after successful delivery or reasonable delivery attempt.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">22</span>
             Automated Access, Data Scraping & Unauthorized Digital Usage
          </h3>
          <p>
            Users shall not directly or indirectly use automated systems, bots, scripts, crawlers, scraping tools, AI systems, extraction technologies, data mining tools, or similar mechanisms to access, monitor, reproduce, copy, download, manipulate, harvest, or commercially exploit website content, pricing data, product information, images, inventory systems, operational data, or digital assets without prior written authorization from the Company.
          </p>
          <p>
            Unauthorized scraping, automated extraction, artificial intelligence training usage, commercial monitoring, replication of website content, or systematic collection of data may constitute violation of intellectual property rights, operational security policies, and applicable laws.
          </p>
          <p>
            The Company reserves the right to restrict access, block systems, suspend accounts, pursue legal remedies, or undertake technical enforcement measures where unauthorized automated activity is detected.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">23</span>
             Limitation of Liability
          </h3>
          <p>
            To the fullest extent permitted under applicable law, the Company shall not be liable for indirect losses, incidental damages, consequential damages, business interruptions, profit losses, shipping delays, technical interruptions, website inaccuracies, third-party failures, payment gateway disruptions, courier-related issues, manufacturer-level changes, or circumstances beyond reasonable control.
          </p>
          <p>
            The Company’s total liability arising from any transaction, dispute, claim, or use of the website shall remain limited to the purchase value of the respective product purchased from the Company.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">24</span>
             Indemnification
          </h3>
          <p>
            Users agree to indemnify, defend, and hold harmless the Company, its directors, employees, affiliates, representatives, service providers, and associated parties from and against any claims, liabilities, damages, losses, costs, expenses, or legal proceedings arising from violation of these Terms, misuse of the website, unlawful conduct, infringement of third-party rights, fraudulent activities, or breach of applicable laws or policies.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">25</span>
             Force Majeure
          </h3>
          <p>
            The Company shall not be liable for failure or delay in performance arising from circumstances beyond reasonable control including natural disasters, strikes, governmental actions, technical failures, internet disruptions, transportation interruptions, war, pandemic conditions, operational shutdowns, cyber incidents, or force majeure events.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">26</span>
             Governing Law & Jurisdiction
          </h3>
          <p>
            These Terms shall be governed and interpreted in accordance with the laws of India.
          </p>
          <p>
            Any disputes arising in connection with the website, products, transactions, services, or these Terms shall be subject to the exclusive jurisdiction of the competent courts located in Delhi, India.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">27</span>
             Entire Agreement
          </h3>
          <p>
            These Terms & Conditions, together with the Company’s Privacy Policy, Shipping, Delivery, Exchange & Warranty Policy, Authenticity & Product Assurance Policy, and any additional operational policies or legal notices published by the Company, collectively constitute the complete and entire agreement between the Company and the user regarding access to the website, purchase activities, products, services, and related transactions.
          </p>
          <p>
            These Terms supersede any prior oral or written discussions, understandings, communications, representations, or agreements relating to the same subject matter unless expressly stated otherwise by the Company in writing.
          </p>
          <p>
            No waiver, delay, or failure by the Company in exercising any right under these Terms shall be interpreted as a waiver of such rights.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">28</span>
             Severability
          </h3>
          <p>
            If any provision, clause, section, or portion of these Terms is determined by a competent authority or court of law to be unlawful, invalid, unenforceable, or contrary to applicable law, such provision shall be interpreted, modified, or limited only to the minimum extent necessary while preserving the intent of the provision wherever legally permissible.
          </p>
          <p>
            The remaining provisions of these Terms shall continue to remain valid, enforceable, and fully effective to the maximum extent permitted under applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">29</span>
             Policy Modifications
          </h3>
          <p>
            The Company reserves the right to revise, modify, update, replace, or discontinue these Terms at any time without prior notice.
          </p>
          <p>
            Any revised version of these Terms shall become effective immediately upon publication on the website unless otherwise specified.
          </p>
          <p>
            Continued access or usage of the website following modifications constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">30</span>
             Contact Information
          </h3>
          <p>
            For questions, legal communication, support requests, or policy-related concerns, customers may contact:
          </p>
          <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100/80 space-y-2.5 text-neutral-800 text-sm">
            <p><strong>Company Name:</strong> Samay</p>
            <p><strong>Email:</strong> <a href="mailto:support@samaywatch.com" className="font-bold text-black underline hover:text-neutral-700 transition-colors">support@samaywatch.com</a></p>
            <p><strong>Phone:</strong> <a href="tel:+918595513656" className="font-bold text-black underline hover:text-neutral-700 transition-colors">+91 85955 13656</a></p>
            <p><strong>Address:</strong> Shop No.5, New Market, Bara Gole Chakkar, Kamla Nagar, New Delhi, Delhi 110007</p>
          </div>
        </section>
      </div>
    )
  },
  'return-refund-policy': {
    title: 'Return & Refund Policy',
    icon: RefreshCw,
    content: (
      <div className="space-y-8">
        <p className="text-lg font-medium text-neutral-800 leading-relaxed">
          At Samay Watch, we are committed to providing you with the highest quality timepieces and a seamless boutique experience. 
          Our refund and exchange policies for online orders are outlined below to ensure complete transparency.
        </p>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">01</span>
             Order Cancellation
          </h3>
          <p>
            To initiate a cancellation, please submit a request by contacting us at <a href="mailto:rajesh@samaywatch.com" className="font-bold text-black underline underline-offset-4">rajesh@samaywatch.com</a> with your order details (Order Confirmation Number and Reference).
          </p>
          <div className="p-4 bg-neutral-50 border-l-4 border-black rounded-r-xl">
             <p className="text-[13px] font-bold uppercase tracking-wider text-black">Cancellation Window</p>
             <p className="mt-1">Orders can only be cancelled or exchanged within <strong>12 hours</strong> of placement.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">02</span>
             Refunds & Exchanges
          </h3>
          <p>
            Upon approval of a valid cancellation request, <span className="font-bold">www.samaywatch.com</span> will refund the full purchase amount within <strong>2 business days</strong> to the original payment source.
          </p>
          <p>
            In case of an exchange, any price difference for the new timepiece must be paid by the customer. If a cancellation is requested after shipment, our support team will guide you through the standard exchange process.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">03</span>
             Manufacturing Defects
          </h3>
          <p>
            If a delivered watch exhibits a manufacturing defect, please report it immediately to <a href="mailto:rajesh@samaywatch.com" className="font-bold text-black underline underline-offset-4">rajesh@samaywatch.com</a> or call us at <a href="tel:+918595513656" className="font-bold text-black underline underline-offset-4">+91 8595513656</a> within <strong>24 hours of delivery</strong>.
          </p>
          <div className="rounded-2xl border border-red-100 bg-red-50/30 p-5">
             <p className="text-[13px] font-bold text-red-900 uppercase tracking-widest leading-relaxed">
               Strict Limit: Samay Watch cannot be held responsible for defects reported after the 24-hour window. No refunds or exchanges will be processed after this period.
             </p>
          </div>
        </section>

        <section className="pt-8 border-t border-neutral-100">
           <p className="text-[12px] font-medium text-neutral-400 italic">
             All legal matters are subject to the exclusive jurisdiction of Delhi.
           </p>
        </section>
      </div>
    )
  },
  'shipping-policy': {
    title: 'Shipping & Delivery Policy',
    updatedAt: 'May 2026',
    icon: Truck,
    content: (
      <div className="space-y-8">
        <div className="text-lg font-medium text-neutral-800 leading-relaxed space-y-4">
          <p><strong>Effective Date:</strong> 1st of May, 2026</p>
          <p>Welcome to Samay (“Company”, “we”, “our”, or “us”).</p>
          <p>This Shipping, Delivery, Exchange & Warranty Policy (“Policy”) governs the shipping, dispatch, delivery, exchange, and warranty-related terms applicable to products purchased through our website, online platforms, retail operations, communication channels, and authorized sales networks.</p>
          <p>The purpose of this Policy is to provide transparency regarding order processing timelines, shipping procedures, delivery expectations, exchange eligibility, warranty-related practices, and customer responsibilities associated with purchases made from the Company.</p>
          <p>By placing an order with the Company, customers (“Customer”, “you”, or “your”) acknowledge that they have read, understood, and agreed to the terms outlined under this Policy.</p>
        </div>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">01</span>
             Order Processing & Dispatch
          </h3>
          <p>
            All orders placed with the Company are subject to product availability, successful payment verification, operational review, and acceptance by the Company.
          </p>
          <p>
            Orders are generally processed and prepared for dispatch within approximately 24 to 48 hours from the time of successful order confirmation or payment verification. Orders placed during weekends, public holidays, festive periods, promotional campaigns, or outside normal business hours may require additional processing time depending upon operational volume and logistical conditions.
          </p>
          <p>
            The Company reserves the right to delay, hold, cancel, or refuse any order at its sole discretion in circumstances including but not limited to suspected fraudulent activity, incorrect pricing, payment verification failure, stock unavailability, operational errors, technical issues, incomplete customer information, or unforeseen circumstances affecting order fulfillment.
          </p>
          <p>
            Customers acknowledge that order confirmation does not automatically constitute final acceptance of an order by the Company, and the Company reserves the right to undertake reasonable verification procedures before dispatch.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">02</span>
             Shipping & Delivery Timelines
          </h3>
          <p>
            The Company undertakes commercially reasonable efforts to dispatch and deliver products within estimated timelines communicated at the time of purchase.
          </p>
          <p>
            Estimated delivery timelines generally range between 3 to 7 business days from the date of dispatch depending upon delivery location, regional accessibility, courier network availability, operational conditions, and shipping partner serviceability.
          </p>
          <p>
            Delivery timelines displayed on the website or communicated through customer support channels are estimates only and shall not be interpreted as guaranteed delivery commitments.
          </p>
          <p>
            While the Company endeavors to ensure timely delivery, customers acknowledge that delivery schedules may vary depending upon logistical circumstances and operational dependencies outside the Company’s direct control.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">03</span>
             Shipping Delays & Force Majeure Conditions
          </h3>
          <p>
            The Company shall not be held responsible for delays in shipping, dispatch, transit, or delivery arising due to circumstances beyond its reasonable control.
          </p>
          <p>
            Such circumstances may include delays caused by courier or logistics partners, transportation disruptions, weather conditions, natural calamities, strikes, regional restrictions, public holidays, government actions, technical failures, customs-related delays, operational interruptions, force majeure events, or other unforeseen conditions affecting transportation or delivery infrastructure.
          </p>
          <p>
            Customers acknowledge that estimated delivery timelines may occasionally be impacted due to such external circumstances and agree that the Company shall not be liable for indirect inconvenience, losses, or claims arising solely from such delays.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">04</span>
             Shipping Address & Customer Responsibility
          </h3>
          <p>
            Customers are solely responsible for ensuring that all shipping and delivery information provided at the time of purchase is complete, accurate, and up to date.
          </p>
          <p>
            Such information may include recipient name, address details, postal code, landmark information, contact number, and any other details necessary for successful delivery.
          </p>
          <p>
            The Company shall not be responsible for failed deliveries, delays, additional shipping costs, losses, or order complications arising due to inaccurate, incomplete, incorrect, or outdated information submitted by the customer.
          </p>
          <p>
            Customers are additionally advised to ensure availability at the delivery location for successful receipt of shipments.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">05</span>
             Packaging & Delivery Inspection
          </h3>
          <p>
            The Company undertakes commercially reasonable efforts to securely package all products before dispatch in order to maintain product safety and shipment integrity during transit.
          </p>
          <p>
            Customers are advised to inspect the outer packaging upon delivery and immediately report any visible signs of tampering, damage, leakage, opening, or suspicious package condition to both the delivery personnel and the Company through official communication channels.
          </p>
          <p>
            The Company may request photographs, videos, or supporting evidence for verification purposes in case any shipping or packaging concerns are reported.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">06</span>
             No Return & No Refund Policy
          </h3>
          <p>
            All products sold by the Company are governed under a strict No Return and No Refund policy.
          </p>
          <p>
            Once a product has been successfully delivered, the Company shall not accept product returns or issue refunds under normal circumstances.
          </p>
          <p>
            By placing an order, customers expressly acknowledge and agree that purchases made through the Company are final, subject only to the limited exchange conditions specifically outlined under this Policy.
          </p>
          <p>
            Requests relating to change of preference, dislike of design, incorrect selection made by the customer, size expectations, personal dissatisfaction, or similar subjective reasons shall not qualify for return, refund, or cancellation after successful delivery.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">07</span>
             Exchange Eligibility
          </h3>
          <p>
            The Company may, at its sole discretion, consider exchange requests only under limited circumstances including:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-neutral-600">
            <li>delivery of an incorrect product,</li>
            <li>receipt of a damaged product,</li>
            <li>manufacturing defects identified upon delivery,</li>
            <li>or substantial mismatch between the delivered product and the confirmed order details.</li>
          </ul>
          <p>
            Exchange requests shall not automatically guarantee approval and shall remain subject to verification, inspection, and compliance with all conditions specified under this Policy.
          </p>
          <p>
            The Company reserves the exclusive right to determine exchange eligibility after reviewing the nature of the claim, supporting evidence, operational records, and product condition.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">08</span>
             Exchange Request Procedure
          </h3>
          <p>
            Customers seeking exchange-related assistance must notify the Company within 24 hours from the time of delivery.
          </p>
          <p>
            All exchange requests must be submitted through the Company’s official support email at: <strong>support@samaywatch.com</strong>
          </p>
          <p>
            Exchange-related communication should include relevant order details, a clear description of the issue, photographs, videos, packaging evidence, and any additional information reasonably requested by the Company for verification purposes.
          </p>
          <p>
            The Company may additionally request unboxing videos, packaging inspection evidence, courier labels, or product condition documentation wherever considered reasonably necessary for claim verification and fraud prevention purposes.
          </p>
          <p>
            Failure to report issues within the prescribed 24-hour reporting period may result in rejection of the exchange request.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">09</span>
             Conditions for Exchange Approval
          </h3>
          <p>
            Exchange requests shall only be considered where the product remains unused, unaltered, untampered, and maintained in its original condition.
          </p>
          <p>
            Customers must ensure that original packaging, tags, accessories, warranty cards, manuals, invoices, inserts, and all related materials remain intact and available for verification purposes.
          </p>
          <p>
            The final packaging box must not show signs of tampering, replacement, misuse, or unauthorized opening beyond reasonable inspection.
          </p>
          <p>
            Products displaying signs of usage, physical damage, mishandling, modification, improper storage, scratches, missing accessories, packaging alteration, or unauthorized repair attempts may not qualify for exchange consideration.
          </p>
          <p>
            The Company reserves the right to inspect returned products before making any exchange-related decision.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">10</span>
             Right to Reject Exchange Requests
          </h3>
          <p>
            The Company reserves the absolute right to reject any exchange request at its sole discretion in circumstances including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-neutral-600">
            <li>delayed reporting beyond the prescribed timeline,</li>
            <li>insufficient evidence,</li>
            <li>absence of original packaging,</li>
            <li>signs of wear or usage,</li>
            <li>tampered packaging,</li>
            <li>physical damage caused after delivery,</li>
            <li>unverifiable claims,</li>
            <li>or suspected fraudulent activity.</li>
          </ul>
          <p>
            The Company’s decision regarding exchange approval, rejection, eligibility assessment, or claim verification shall be final and binding to the maximum extent permitted under applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">11</span>
             Brand Warranty
          </h3>
          <p>
            Products sold by the Company may include applicable manufacturer warranty coverage wherever provided by the respective brand.
          </p>
          <p>
            Warranty duration, warranty scope, service procedures, exclusions, limitations, and warranty terms shall vary depending upon the respective brand, product model, and manufacturer policies.
          </p>
          <p>
            All warranty-related repairs, servicing, approvals, replacements, and warranty claims shall be governed solely by the terms, conditions, procedures, and decisions of the respective brand or authorized service provider.
          </p>
          <p>
            The Company shall not be independently liable for warranty claim approvals or rejections, repair timelines, service center decisions, manufacturer delays, or brand-level warranty limitations.
          </p>
          <p>
            Customers are advised to carefully preserve original invoices, warranty cards, tags, packaging materials, and related documentation for future warranty-related purposes and manufacturer servicing requirements.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">12</span>
             Product Appearance & Representation
          </h3>
          <p>
            The Company undertakes commercially reasonable efforts to ensure that all product descriptions, specifications, images, colors, dimensions, pricing, and related information displayed on the website are accurate and updated.
          </p>
          <p>
            However, minor variations may occur due to photography lighting, screen display settings, manufacturer packaging updates, production batch variations, or brand-level revisions.
          </p>
          <p>
            Additionally, despite reasonable operational efforts, occasional human errors, typographical mistakes, pricing inaccuracies, specification discrepancies, image mismatches, or technical inaccuracies may occur on the website or associated platforms.
          </p>
          <p>
            The Company reserves the right to correct such inaccuracies, update information, revise pricing, modify specifications, cancel affected orders, or contact customers for clarification prior to dispatch wherever reasonably necessary.
          </p>
          <p>
            Minor variations, temporary inaccuracies, or display differences shall not automatically qualify as defects, misrepresentation, or valid grounds for dispute.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">13</span>
             Limitation of Liability
          </h3>
          <p>
            While the Company undertakes commercially reasonable efforts to maintain efficient shipping operations, accurate product representation, secure packaging, and customer service standards, the Company shall not be liable for indirect losses, consequential damages, shipping delays, operational interruptions, manufacturer-level changes, courier-related issues, technical inaccuracies, or third-party service failures beyond the Company’s reasonable control.
          </p>
          <p>
            To the fullest extent permitted under applicable law, the Company’s total liability arising from any transaction, shipment, exchange request, or warranty-related matter shall remain limited to the purchase value of the respective product purchased from the Company.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">14</span>
             Policy Modifications
          </h3>
          <p>
            The Company reserves the right to revise, update, modify, replace, or discontinue this Policy at any time without prior notice.
          </p>
          <p>
            Any revised version of this Policy shall become effective immediately upon publication on the website unless otherwise specified.
          </p>
          <p>
            Customers are encouraged to periodically review this Policy to remain informed regarding current shipping practices, exchange conditions, warranty procedures, and operational terms.
          </p>
          <p>
            Continued use of the website or purchase of products following any modification to this Policy constitutes acceptance of the revised terms.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-3">
             <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-[12px] font-black">15</span>
             Contact Information
          </h3>
          <p>
            For shipping-related concerns, exchange requests, warranty communication, or policy-related questions, customers may contact:
          </p>
          <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100/80 space-y-2.5 text-neutral-800 text-sm">
            <p><strong>Company Name:</strong> Samay</p>
            <p><strong>Email:</strong> <a href="mailto:support@samaywatch.com" className="font-bold text-black underline hover:text-neutral-700 transition-colors">support@samaywatch.com</a></p>
            <p><strong>Phone:</strong> <a href="tel:+918595513656" className="font-bold text-black underline hover:text-neutral-700 transition-colors">+91 85955 13656</a></p>
            <p><strong>Address:</strong> Shop No.5, New Market, Bara Gole Chakkar, Kamla Nagar, New Delhi, Delhi 110007</p>
          </div>
        </section>
      </div>
    )
  }
}

export default function Policies() {
  const { type } = useParams()
  const policy = POLICY_DATA[type] || POLICY_DATA['privacy-policy']
  const Icon = policy.icon

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [type])

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <nav className="border-b border-neutral-100 bg-white" aria-label="Breadcrumb">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 md:px-8">
          <ol className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-neutral-500 sm:text-xs">
            <li><Link to="/" className="hover:text-neutral-900 transition-colors">Home</Link></li>
            <li aria-hidden className="text-neutral-300">/</li>
            <li className="text-neutral-900">Policies</li>
            <li aria-hidden className="text-neutral-300">/</li>
            <li className="text-neutral-900 italic capitalize">{type?.replace(/-/g, ' ')}</li>
          </ol>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:px-8">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
            <Icon className="size-8 text-neutral-900" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-neutral-900">{policy.title}</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-bold mt-1">Last updated: {policy.updatedAt || 'April 2026'}</p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-neutral max-w-none text-neutral-600 leading-relaxed"
        >
          {policy.content}
        </motion.div>

        <div className="mt-20 p-8 bg-neutral-900 rounded-3xl text-white">
          <h2 className="font-serif text-2xl font-normal mb-4 text-white">Have questions?</h2>
          <p className="text-neutral-400 text-sm mb-6">If you need clarification on any of our policies, our team is here to help.</p>
          <Link 
            to="/contact" 
            className="inline-flex h-12 items-center justify-center bg-white text-black px-8 rounded-full text-[12px] font-bold uppercase tracking-widest transition-transform hover:scale-105"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
