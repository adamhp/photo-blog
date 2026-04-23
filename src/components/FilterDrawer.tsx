import { AnimatePresence, motion } from 'motion/react';
import { FilterSidebar } from './FilterSidebar';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FilterDrawer({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-ink/30 lg:hidden z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-72 max-w-[80vw] bg-paper p-6 z-50 overflow-y-auto lg:hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex justify-between items-baseline mb-6">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ash">
                Filters
              </span>
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-sm text-ink hover:text-accent"
                aria-label="Close filters"
              >
                CLOSE ✕
              </button>
            </div>
            <FilterSidebar variant="mobile" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
