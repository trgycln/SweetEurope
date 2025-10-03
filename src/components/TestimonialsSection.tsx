import React from 'react';
import Image from 'next/image';
import { FaQuoteLeft } from 'react-icons/fa';

const TestimonialsSection: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  const testimonials = [
    {
      review: dictionary.testimonials.review1,
      name: dictionary.testimonials.name1,
      company: dictionary.testimonials.company1,
      imageUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      review: dictionary.testimonials.review2,
      name: dictionary.testimonials.name2,
      company: dictionary.testimonials.company2,
      imageUrl: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
    {
      review: dictionary.testimonials.review3,
      name: dictionary.testimonials.name3,
      company: dictionary.testimonials.company3,
      imageUrl: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=400',
    },
  ];

  return (
    <section className="bg-secondary py-20 px-6">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-serif mb-12">
          {dictionary.testimonials.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-lg p-8 shadow-lg text-left flex flex-col">
              <FaQuoteLeft className="text-accent text-3xl mb-4" />
              <p className="font-sans text-text-main italic mb-6 flex-grow">
                "{testimonial.review}"
              </p>
              <div className="flex items-center mt-auto">
                <div className="relative w-14 h-14 rounded-full overflow-hidden mr-4">
                  <Image
                    src={testimonial.imageUrl}
                    alt={`Foto von ${testimonial.name}`}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div>
                  <p className="font-bold font-sans text-primary">{testimonial.name}</p>
                  <p className="font-sans text-sm text-gray-500">{testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

