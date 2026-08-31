import React from 'react';
import { numberToWords } from '@/lib/numberToWords';
import './DonationReceiptHTML.css';

export interface DonationReceiptHTMLProps {
  fieldValues: {
    receiptNumber: string;
    date: string;
    donorName: string;
    donorEmail?: string;
    donorPhone?: string;
    donorPan?: string;
    donorAddress?: string;
    pinCode?: string;
    amount: string; // formatted like "₹12,345" or "12345"
    amountInWords?: string;
    modeOfDonation?: string; // "Online", "Cash", "Cheque", etc.
    purpose: string;
    paymentMethod?: string;
    transactionId?: string;
  };
  cardRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const DonationReceiptHTML: React.FC<DonationReceiptHTMLProps> = ({ fieldValues, cardRef, className = '' }) => {
  const getAmountInWords = () => {
    if (fieldValues.amountInWords) return fieldValues.amountInWords;
    if (!fieldValues.amount) return '';
    const numericAmount = parseFloat(fieldValues.amount.replace(/[^\d.-]/g, ''));
    if (isNaN(numericAmount)) return '';
    return numberToWords(numericAmount);
  };

  const renderPinCode = (pin?: string) => {
    const defaultBoxes = Array(6).fill('');
    const pinChars = pin ? pin.slice(0, 6).split('') : [];
    const boxes = defaultBoxes.map((_, i) => pinChars[i] || '');

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '12px', verticalAlign: 'middle' }}>
        {boxes.map((char, index) => (
          <div key={index} style={{
            width: '24px',
            height: '24px',
            border: '1.5px solid #000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 900,
            backgroundColor: '#ffffff',
            color: '#000000'
          }}>
            {char}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      ref={cardRef as any}
      className={`donation-receipt-page ${className}`}
      style={{
        width: '210mm',
        height: '297mm',
        maxHeight: '297mm',
        backgroundColor: '#ffffff',
        fontFamily: "'Arial', 'Helvetica Neue', 'Helvetica', sans-serif",
        boxSizing: 'border-box',
        padding: '6mm',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Outer Orange Frame */}
      <div style={{
        border: '4.5px solid #e65c00',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: 1,
      }}>

        {/* 1. TOP BAR */}
        <div style={{
          borderBottom: '2px solid #000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          backgroundColor: '#ffffff',
        }}>
          <div style={{ color: '#000080', fontWeight: 'bold', fontSize: '15px', letterSpacing: '0.5px' }}>PAN - AADTV2345L</div>
          <div style={{ 
            color: '#000000', 
            fontWeight: 900, 
            fontSize: '20px', 
            textDecoration: 'underline',
            letterSpacing: '1.5px',
          }}>
            DONATION RECEIPT
          </div>
          <div style={{ color: '#000080', fontWeight: 'bold', fontSize: '15px', letterSpacing: '0.5px' }}>TAN No. &nbsp;SRTV10829A</div>
        </div>

        {/* 2. HEADER AREA */}
        <div style={{ padding: '10px 14px 8px 14px', borderBottom: '2px solid #000' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
            {/* Logo */}
            <div style={{
              width: '95px',
              height: '95px',
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <img src="/logo.jpg" alt="Trust Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Trust Details */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#d03b0d', marginBottom: '4px', letterSpacing: '0.5px' }}>
                Valmiki Samaj Charitable Trust
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#000', marginBottom: '3px' }}>
                Rg.No. F/1968/Aravalli, &nbsp;&nbsp;Establishment Dt. 24/01/2020
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#000', marginBottom: '3px' }}>
                Web site - https : //valmikisamajcharitabletrust.org
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#b91c1c', marginBottom: '3px' }}>
                President Narayan Rathod, &nbsp;Contact +91 8200315792
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#000' }}>
                ✉ valmikisamajcharitabletrust@gmail.com
              </div>
            </div>

            {/* QR */}
            <div style={{ width: '95px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: '82px', height: '82px', border: '1.5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                <svg viewBox="0 0 100 100" width="70" height="70">
                  <rect width="100" height="100" fill="white"/>
                  <rect x="5" y="5" width="28" height="28" fill="black"/>
                  <rect x="9" y="9" width="20" height="20" fill="white"/>
                  <rect x="13" y="13" width="12" height="12" fill="black"/>
                  <rect x="67" y="5" width="28" height="28" fill="black"/>
                  <rect x="71" y="9" width="20" height="20" fill="white"/>
                  <rect x="75" y="13" width="12" height="12" fill="black"/>
                  <rect x="5" y="67" width="28" height="28" fill="black"/>
                  <rect x="9" y="71" width="20" height="20" fill="white"/>
                  <rect x="13" y="75" width="12" height="12" fill="black"/>
                  <rect x="40" y="10" width="8" height="8" fill="black"/>
                  <rect x="50" y="20" width="8" height="8" fill="black"/>
                  <rect x="40" y="40" width="12" height="12" fill="black"/>
                  <rect x="60" y="45" width="8" height="8" fill="black"/>
                  <rect x="75" y="65" width="10" height="10" fill="black"/>
                  <rect x="45" y="75" width="8" height="8" fill="black"/>
                </svg>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000', marginTop: '3px', textAlign: 'center' }}>Scaner to Verify</div>
            </div>
          </div>

          <div style={{ fontSize: '12.5px', fontWeight: 'bold', textAlign: 'center', color: '#000', marginTop: '6px' }}>
            📍Ramji Mandir Rd, At & Post - Tintoi, Tal - Modasa, Dist - Aravalli, Pin - 383250
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 900, textAlign: 'center', color: '#c026d3', marginTop: '4px', letterSpacing: '0.3px' }}>
            Bank Acc. BOB 07210100099557 RTGS/NEFT IFSC CODE BARB0MODASA
          </div>
        </div>

        {/* 3. REGISTRATION 2-COLUMN SECTION */}
        <div style={{ display: 'flex', borderBottom: '2px solid #000' }}>
          <div style={{ flex: 1, padding: '8px 12px', textAlign: 'center', fontSize: '12.5px', lineHeight: 1.45, borderRight: '2px solid #000' }}>
            <div style={{ color: '#1e40af', fontWeight: 900, fontSize: '13.5px' }}>12AB (1) (b) &nbsp;U R N</div>
            <div style={{ color: '#dc2626', fontWeight: 900, fontSize: '13.5px' }}>AADTV2345L24AD01</div>
            <div><strong>21/05/2025 From</strong></div>
            <div><strong>AY 2024-25 to AY 2028-29</strong></div>
          </div>
          <div style={{ flex: 1, padding: '8px 12px', textAlign: 'center', fontSize: '12.5px', lineHeight: 1.45 }}>
            <div>
              <span style={{ color: '#1e40af', fontWeight: 900, fontSize: '13.5px' }}>80G U R N</span> &nbsp;
              <span style={{ color: '#dc2626', fontWeight: 900, fontSize: '13.5px' }}>AADTV2345L25AD01</span> &nbsp;
              <strong>17/02/2026</strong>
            </div>
            <div><strong>From AY 2026 - 2027 To AY 2030 - 2031</strong></div>
            <div>Clause (ii) of 2nd Proviso to</div>
            <div><strong>section 80 G (5) of the Income Tax Act,1961</strong></div>
          </div>
        </div>

        {/* 4. CSR BANNER */}
        <div style={{ background: '#fff', borderBottom: '2px solid #000', textAlign: 'center', padding: '7px 10px', fontSize: '13px', fontWeight: 'bold' }}>
          <span style={{ color: '#ea580c', fontWeight: 900 }}>CORPORATE SOCIAL RESPONSIBILITY</span> activities and Registration Number <span style={{ color: '#ea580c', fontWeight: 900 }}>CSR00072060</span>
        </div>

        {/* 5. NGO DARPAN */}
        <div style={{ borderBottom: '2px solid #000', textAlign: 'center', padding: '7px 10px', fontSize: '14.5px', fontWeight: 900, color: '#b91c1c' }}>
          NGO Darpan &nbsp;(Niti Aayog) &nbsp;Number &nbsp;&nbsp;<span style={{ color: '#b91c1c', fontWeight: 900 }}>GJ / 2024 / 0459191</span>
        </div>

        {/* 6. MAIN TABLE FORM */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', borderBottom: '1.5px solid #000', borderRight: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '155px', display: 'inline-block' }}>Donation Receipt Date</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>: {fieldValues.date || ''}</span>
              </td>
              <td style={{ width: '50%', borderBottom: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '120px', display: 'inline-block' }}>Receipt Number</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>: {fieldValues.receiptNumber || ''}</span>
              </td>
            </tr>

            <tr>
              <td colSpan={2} style={{ borderBottom: '1.5px solid #000', padding: '6px 12px', textAlign: 'center', color: '#ea580c', fontSize: '14.5px', fontWeight: 900, letterSpacing: '0.8px' }}>
                UNIQUE IDENTIFICATION NUMBER OF DONOR
              </td>
            </tr>

            <tr>
              <td style={{ width: '50%', borderBottom: '1.5px solid #000', borderRight: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '70px', display: 'inline-block' }}>PAN</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>: {fieldValues.donorPan || ''}</span>
              </td>
              <td style={{ width: '50%', borderBottom: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '100px', display: 'inline-block' }}>Mobile +91</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>: {fieldValues.donorPhone?.replace('+91', '').trim() || ''}</span>
              </td>
            </tr>

            <tr>
              <td colSpan={2} style={{ borderBottom: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '155px', display: 'inline-block' }}>Name of Donor</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>: {fieldValues.donorName || ''}</span>
              </td>
            </tr>

            <tr>
              <td colSpan={2} style={{ borderBottom: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '155px', display: 'inline-block' }}>Address of Donor</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>: {fieldValues.donorAddress || ''}</span>
              </td>
            </tr>

            <tr>
              <td colSpan={2} style={{ borderBottom: '1.5px solid #000', padding: '8px 12px', textAlign: 'right', paddingRight: '18px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '13.5px', verticalAlign: 'middle' }}>Pin Code</span>
                {renderPinCode(fieldValues.pinCode)}
              </td>
            </tr>

            <tr>
              <td colSpan={2} style={{ borderBottom: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '155px', display: 'inline-block' }}>E-Mail Id</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>: {fieldValues.donorEmail || ''}</span>
              </td>
            </tr>

            <tr>
              <td colSpan={2} style={{ borderBottom: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '155px', display: 'inline-block' }}>Amount of Donation</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '16px' }}>: {fieldValues.amount?.replace(/₹/g, 'Rs. ') || ''}</span>
              </td>
            </tr>

            <tr>
              <td colSpan={2} style={{ borderBottom: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '155px', display: 'inline-block' }}>Mode of Donation</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>: {fieldValues.modeOfDonation || fieldValues.paymentMethod || ''}</span>
              </td>
            </tr>

            <tr>
              <td colSpan={2} style={{ borderBottom: '1.5px solid #000', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', minWidth: '200px', display: 'inline-block' }}>Amount Donation in Words</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px', textTransform: 'capitalize' }}>: {getAmountInWords()}</span>
              </td>
            </tr>

            <tr style={{ height: '85px' }}>
              <td style={{ width: '58%', borderRight: '1.5px solid #000', verticalAlign: 'top', padding: '8px 12px' }}>
                <span style={{ color: '#000', fontSize: '13.5px', display: 'block', marginBottom: '5px' }}>Purpose of Donation</span>
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '14px' }}>: {fieldValues.purpose || ''}</span>
              </td>
              <td style={{ width: '42%', textAlign: 'center', verticalAlign: 'bottom', paddingBottom: '10px' }}>
                <div style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: '26px', color: '#1e3a8a', marginBottom: '4px' }}>
                  Narayan Rathod
                </div>
                <div style={{ color: '#b91c1c', fontWeight: 900, fontSize: '13px' }}>
                  President/Founder(Narayan Rathod)
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 7. FOOTER SECTION */}
        <div style={{ padding: '10px 14px 12px 14px', fontSize: '12px', lineHeight: 1.65 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#000', fontWeight: 'bold' }}>
            <span style={{ color: '#1e40af', fontWeight: 900, fontSize: '15px', lineHeight: 1.2 }}>➡</span>
            <span>Your Donation is Tax Exempted Under Section 80G (5) which Donation is eligible for Deduction.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#000', fontWeight: 'bold' }}>
            <span style={{ color: '#1e40af', fontWeight: 900, fontSize: '15px', lineHeight: 1.2 }}>➡</span>
            <span>All Disputes Regarding Donation Receipts Subject to Mosasa, State Gujrat Jurisdiction only.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#000', fontWeight: 'bold' }}>
            <span style={{ color: '#1e40af', fontWeight: 900, fontSize: '15px', lineHeight: 1.2 }}>➡</span>
            <span>Cheque or DD is Subject to Realisation. <span style={{ color: '#1e40af', fontWeight: 900 }}>Thank you so much for your Generous Support.</span></span>
          </div>
        </div>

      </div>
    </div>
  );
};
